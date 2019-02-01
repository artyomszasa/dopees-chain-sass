import * as s from 'node-sass';
import { Executor, Task, Context, FileName, Helpers as h, ReversePathResolverConfig, ReversePathResolver, derived, PathResolver, Executors } from 'dopees-chain';
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
  targetRoot: string;
  subfolders?: boolean;
  //sourceResolver?: (path: string, basePath?: string) => string;
  includePaths?: string[];
  outputStyle?: "compact" | "compressed" | "expanded" | "nested";
  precision?: number;
  persists?: boolean;
  production?: boolean;
}

export class SassMapperState implements derived.FileMapperState {
  sourceResolver: PathResolver;
  innerStateKey: string;
  selector: (path: string, context: Context) => boolean;
  outputStyle?: "compact" | "compressed" | "expanded" | "nested";
  precision?: number;
  production: boolean;
  constructor(options: Options) {
    this.sourceResolver = ReversePathResolver.from(options);
    this.innerStateKey = 'sass.innerState';
    const extension = `.${options.targetExt || 'css'}`;
    this.selector = (path: string, context: Context) => {
      const absoluteTargetRoot = fspath.normalize(fspath.join(context.basePath, options.targetRoot));
      return path.endsWith(extension) && PathResolver.match(path, absoluteTargetRoot, options.subfolders);
    };
    this.outputStyle = options.outputStyle;
    this.precision = options.precision
    this.production = true === options.production;
  }
}

interface SassInnerState {
  readonly sourceCode: string;
  readonly sourcePath: string;
}

export class SassMapper extends derived.FileMapper<Options, SassInnerState, SassMapperState>  {
  name = 'sass';
  protected async generate(state: SassMapperState, task: Task, innerState: SassInnerState, _: Context) {
    console.warn(state.production);
    const options : s.Options = {
      outputStyle: state.outputStyle || 'compressed',
      precision: state.precision,
      file: innerState.sourcePath,
      data: innerState.sourceCode,
      outFile: (<FileName>task.name).path,
      sourceMap: !state.production,
      sourceMapContents: !state.production,
      sourceMapEmbed: !state.production
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
  protected init(options: Options): SassMapperState { return new SassMapperState(options); }
}

export class SassDependencyResolver extends derived.FileDependencyResolver<{ sourceExt?: string }, SassInnerState, derived.FileDependencyResolverState & { innerStateKey: string, dependenciesKey: string }> {
  name = 'sass:deps';
  protected async readSource(_: derived.FileDependencyResolverState & { innerStateKey: string; dependenciesKey: string; }, task: Task, context: Context): Promise<SassInnerState> {
    const code = await context.getContents(task, 'utf-8');
    return {
      sourceCode: code,
      sourcePath: (<FileName>task.name).path
    };
  }
  protected async readDependencies(_: derived.FileDependencyResolverState & { innerStateKey: string; dependenciesKey: string; }, task: Task, innerState: SassInnerState, context: Context): Promise<string[]> {
    const folder = fspath.dirname(innerState.sourcePath);
    return await Promise.all(getMatches(/^@import '(.*)';?$/mg, innerState.sourceCode)
      .map(m => m[1])
      .map(relative => resolveDependency(folder, relative, [ folder ]))); // FIXME: includePaths
  }
  protected init(options: { sourceExt?: string }): derived.FileDependencyResolverState & { innerStateKey: string; dependenciesKey: string; } {
    const extension = `.${options.sourceExt || 'scss'}`;
    return {
      selector: (path: string) => path.endsWith(extension),
      dependenciesKey: 'sass.dependencies',
      innerStateKey: 'sass.innerState'
    };
  }
}

export function sass(options?: Options): Executor {
  if (!options) {
    throw new Error('targetRoot must be specified');
  }
  // FIXME: propagate
  // const includePaths = opts.includePaths || [];
  const sassExecutor = new SassMapper().createExecutor(options);
  const sassDepsExecutor = new SassDependencyResolver().createExecutor(options);
  return Executors.combine(sassExecutor, sassDepsExecutor);
}