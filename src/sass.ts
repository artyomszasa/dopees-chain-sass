import * as s from 'node-sass';
import { Executor, Task, Context, FileName, Helpers as h, ReversePathResolverConfig, ReversePathResolver, derived, PathResolver } from 'dopees-chain';
import * as fs from 'fs';
import * as fspath from 'path';

const fsp = fs.promises;

// const fileStat = (path: string): Promise<fs.Stats> => new Promise((resolve, reject) => fs.stat(path, (err, stats) => err ? reject(err) : resolve(stats)));

const fileExists = (path: string): Promise<boolean> => fsp.access(path).then(() => true, () => false);

const sassRender = (options: s.Options): Promise<s.Result> => new Promise((resolve, reject) => s.render(options, (err, result) => {
  if (err) {
    reject(err);
  } else {
    resolve(result);
  }
}))

const resolveDependency = async (rootPath:string, path: string, includePaths: string[]) => {
  let folder: string;
  let fname: string;
  if (path.includes(fspath.sep)) {
    folder = fspath.dirname(path);
    fname = fspath.basename(path);
  } else {
    folder = '';
    fname = path;
  }
  if (!fname.endsWith('.scss')) {
    fname = fname + '.scss';
  }
  for (const basePath of includePaths) {
    let candidate = fspath.normalize(fspath.join(basePath, folder, fname));
    if (await fileExists(candidate)) {
      return candidate;
    }
    if (!fname.startsWith('_')) {
      candidate = fspath.normalize(fspath.join(basePath, folder, '_' + fname));
      if (await fileExists(candidate)) {
        return candidate;
      }
    }
  }
  throw new Error(`could not resolve ${path} while processing ${rootPath}, search paths: ${includePaths}`);
}

const getMatches = (regex: RegExp, input: string) => {
  const result = [];
  for (let m = regex.exec(input); m; m = regex.exec(input)) {
    result.push(m);
  }
  return result;
}

interface Dependencies {
  readonly mtime: Date;
  readonly deps: string[];
}

export interface Options extends ReversePathResolverConfig {
  //sourceResolver?: (path: string, basePath?: string) => string;
  includePaths?: string[];
  outputStyle?: "compact" | "compressed" | "expanded" | "nested";
  precision?: number;
  persists?: boolean
}

export class SassMapperState implements derived.FileMapperState {
  sourceResolver: PathResolver;
  innerStateKey: string;
  selector: (path: string) => boolean;
  outputStyle?: "compact" | "compressed" | "expanded" | "nested";
  precision?: number;
  constructor(options: Options) {
    this.sourceResolver = ReversePathResolver.from(options);
    this.innerStateKey = 'sass.innerState';
    const extension = `.${options.targetExt || 'css'}`;
    this.selector = (path: string) => path.endsWith(extension);
    this.outputStyle = options.outputStyle;
    this.precision = options.precision
  }
}

interface SassInnerState {
  readonly sourceCode: string;
  readonly sourcePath: string;
}

export class SassMapper extends derived.FileMapper<Options, SassInnerState, SassMapperState>  {
  protected async generate(state: SassMapperState, task: Task, innerState: SassInnerState, _: Context) {
    const options : s.Options = {
      outputStyle: state.outputStyle || 'compressed',
      precision: state.precision,
      file: innerState.sourcePath,
      data: innerState.sourceCode,
      outFile: (<FileName>task.name).path,
      sourceMap: true
    };
    const sassResult = await sassRender(options);
    return sassResult.css;
  }
  protected async readSource(_: SassMapperState, task: Task, context: Context) {
    const code = await context.getContents(task, 'utf-8');
    return {
      sourceCode: code,
      sourcePath: (<FileName>task.name).path
    };
  }
  protected name = 'sass';
  protected init(options: Options): SassMapperState { return new SassMapperState(options); }
}

export function sass(options?: Options): Executor {
  const opts = options || {};
  const sassOptions: s.Options = {
    includePaths: opts.includePaths,
    outputStyle: opts.outputStyle,
    precision: opts.precision
  };
  const includePaths = opts.includePaths || [];
  const persist = false !== opts.persists;
  const sourceResolver = ReversePathResolver.from(opts);
  return async (task: Task, context: Context) => {
    const name = task.name;
    // [css <--- scss] case
    if (name instanceof FileName) {
      if (name.path.endsWith(opts.targetExt ? `.${opts.targetExt}` : '.css')) {
        const source = sourceResolver(name.path, name.basePath);
        if (!source) {
          throw new Error(`unable to resolve source for ${name.path} (basePath = ${name.basePath || context.basePath})`);
        }
        let scssTask = Task.file(source, context.basePath);
        context.log('sass', task, `resolved source => ${scssTask.name}`);
        // execute dependency (.css), possibly triggering subdependencies....
        scssTask = await context.execute(scssTask);

        // check if file already exists...
        const mtime = await h.getMtime(task, context);
        if (mtime) {
          // check if source if older (no direct mtime as some dependency of the source could have changed instead of
          // the source itself)...
          const sourceMtime = await h.getMtime(scssTask, context);
          if (sourceMtime && sourceMtime <= mtime) {
            // no need to recompile, contents will be loaded on demand
            context.log('sass', task, 'up to date');
            return;
          }
        }
        context.log('sass', task, 'running sass...');
        // in all other cases ---> compile....
        const options : s.Options = {
          ...sassOptions,
          file: source,
          data: await context.getContents(scssTask, 'utf-8'),
          outFile: name.path,
          sourceMap: true
        };
        const sassResult = await sassRender(options);
        context.log('sass', task, 'done running sass');
        context.log('sass', task, 'storing css');
        const res = await context.saveContents(task, sassResult.css, persist);
        context.log('sass', task, 'done');
        return res;
      }
      // [scss <--- scss dependencies] case
      if (name.path.endsWith(opts.sourceExt ? `.${opts.sourceExt}` : '.scss')) {
        const startTs = Date.now();
        context.log('sass:dep', task, 'starting...');
        let mtime: Date;
        try {
          const stats = await fsp.stat(name.path);
          mtime = stats.mtime;
        } catch (e) {
          throw new Error(`file not found: ${name.path}`);
        }
        let deps : string[];
        const entry = await context.storage.getObject<Dependencies>(`!sass.deps!${name.path}`);
        if (entry && entry.mtime <= mtime) {
          // dependencies did not change
          context.log('sass:dep', task, 'using cached dependencies');
          deps = entry.deps;
        } else {
          context.log('sass:dep', task, 'resolving dependencies...');
          const data = await context.getContents(task);
          const contents = data.toString('utf-8');
          const folder = fspath.dirname(name.path);
          deps = await Promise.all(getMatches(/^@import '(.*)';?$/mg, contents)
            .map(m => m[1])
            .map(relative => resolveDependency(name.path, relative, [ folder, ...includePaths])));
          // cache dependencies
          await context.storage.setObject(`!sass.deps!${name.path}`, { mtime, deps });
        }
        if (deps.length) {
          const depTasks = deps.map(dep => Task.file(dep, context.basePath));
          context.log('sass:dep', task, `done resolving dependencies => ${depTasks.map(t => name).join(',')}`);
          const mtimes = [mtime];
          await Promise.all(depTasks.map(async t => {
            const depTask = await context.execute(t);
            mtimes.push(await h.getMtime(depTask, context) || mtime);
          }))
          const mtimeMilliseconds = Math.max.apply(Math, mtimes.map(date => date.getTime()));
          mtime = new Date();
          mtime.setTime(mtimeMilliseconds);
        } else {
          context.log('sass:dep', task, 'done resolving dependencies => none');
        }
        const res = await h.setMtime(task, mtime, context);
        context.log('sass:dep', task, 'done', Date.now() - startTs);
        return res;
      }
    }
  }
}