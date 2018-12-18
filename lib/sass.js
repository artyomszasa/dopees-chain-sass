"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const s = require("node-sass");
const dopees_chain_1 = require("dopees-chain");
const fs = require("fs");
const fspath = require("path");
const fsp = fs.promises;
// const fileStat = (path: string): Promise<fs.Stats> => new Promise((resolve, reject) => fs.stat(path, (err, stats) => err ? reject(err) : resolve(stats)));
const fileExists = (path) => fsp.access(path).then(() => true, () => false);
const sassRender = (options) => new Promise((resolve, reject) => s.render(options, (err, result) => {
    if (err) {
        reject(err);
    }
    else {
        resolve(result);
    }
}));
const resolveDependency = async (rootPath, path, includePaths) => {
    let folder;
    let fname;
    if (path.includes(fspath.sep)) {
        folder = fspath.dirname(path);
        fname = fspath.basename(path);
    }
    else {
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
};
const getMatches = (regex, input) => {
    const result = [];
    for (let m = regex.exec(input); m; m = regex.exec(input)) {
        result.push(m);
    }
    return result;
};
class SassMapperState {
    constructor(options) {
        this.sourceResolver = dopees_chain_1.ReversePathResolver.from(options);
        this.innerStateKey = 'sass.innerState';
        const extension = `.${options.targetExt || 'css'}`;
        this.selector = (path, context) => {
            const absoluteTargetRoot = fspath.normalize(fspath.join(context.basePath, options.targetRoot));
            return path.endsWith(extension) && dopees_chain_1.PathResolver.match(path, absoluteTargetRoot, options.subfolders);
        };
        this.outputStyle = options.outputStyle;
        this.precision = options.precision;
    }
}
exports.SassMapperState = SassMapperState;
class SassMapper extends dopees_chain_1.derived.FileMapper {
    constructor() {
        super(...arguments);
        this.name = 'sass';
    }
    async generate(state, task, innerState, _) {
        const options = {
            outputStyle: state.outputStyle || 'compressed',
            precision: state.precision,
            file: innerState.sourcePath,
            data: innerState.sourceCode,
            outFile: task.name.path,
            sourceMap: true
        };
        const sassResult = await sassRender(options);
        return sassResult.css;
    }
    async readSource(_, task, context) {
        const code = await context.getContents(task, 'utf-8');
        return {
            sourceCode: code,
            sourcePath: task.name.path
        };
    }
    init(options) { return new SassMapperState(options); }
}
exports.SassMapper = SassMapper;
class SassDependencyResolver extends dopees_chain_1.derived.FileDependencyResolver {
    constructor() {
        super(...arguments);
        this.name = 'sass:deps';
    }
    async readSource(_, task, context) {
        const code = await context.getContents(task, 'utf-8');
        return {
            sourceCode: code,
            sourcePath: task.name.path
        };
    }
    async readDependencies(_, task, innerState, context) {
        const folder = fspath.dirname(innerState.sourcePath);
        return await Promise.all(getMatches(/^@import '(.*)';?$/mg, innerState.sourceCode)
            .map(m => m[1])
            .map(relative => resolveDependency(folder, relative, [folder]))); // FIXME: includePaths
    }
    init(options) {
        const extension = `.${options.sourceExt || 'scss'}`;
        return {
            selector: (path) => path.endsWith(extension),
            dependenciesKey: 'sass.dependencies',
            innerStateKey: 'sass.innerState'
        };
    }
}
exports.SassDependencyResolver = SassDependencyResolver;
function sass(options) {
    if (!options) {
        throw new Error('targetRoot must be specified');
    }
    // FIXME: propagate
    // const includePaths = opts.includePaths || [];
    const sassExecutor = new SassMapper().createExecutor(options);
    const sassDepsExecutor = new SassDependencyResolver().createExecutor(options);
    return dopees_chain_1.Executors.combine(sassExecutor, sassDepsExecutor);
}
exports.sass = sass;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Fzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zYXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQStCO0FBQy9CLCtDQUFpSztBQUNqSyx5QkFBeUI7QUFDekIsK0JBQStCO0FBRS9CLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUM7QUFFeEIsNkpBQTZKO0FBRTdKLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBWSxFQUFvQixFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRXRHLE1BQU0sVUFBVSxHQUFHLENBQUMsT0FBa0IsRUFBcUIsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUU7SUFDL0gsSUFBSSxHQUFHLEVBQUU7UUFDUCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDYjtTQUFNO1FBQ0wsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ2pCO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUVILE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUFFLFFBQWUsRUFBRSxJQUFZLEVBQUUsWUFBc0IsRUFBRSxFQUFFO0lBQ3hGLElBQUksTUFBYyxDQUFDO0lBQ25CLElBQUksS0FBYSxDQUFDO0lBQ2xCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDN0IsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDL0I7U0FBTTtRQUNMLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDWixLQUFLLEdBQUcsSUFBSSxDQUFDO0tBQ2Q7SUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM1QixLQUFLLEdBQUcsS0FBSyxHQUFHLE9BQU8sQ0FBQztLQUN6QjtJQUNELEtBQUssTUFBTSxRQUFRLElBQUksWUFBWSxFQUFFO1FBQ25DLElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxNQUFNLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUMvQixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUNELElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzFCLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6RSxJQUFJLE1BQU0sVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUMvQixPQUFPLFNBQVMsQ0FBQzthQUNsQjtTQUNGO0tBQ0Y7SUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixJQUFJLHFCQUFxQixRQUFRLG1CQUFtQixZQUFZLEVBQUUsQ0FBQyxDQUFDO0FBQzNHLENBQUMsQ0FBQTtBQUVELE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWEsRUFBRSxFQUFFO0lBQ2xELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3hELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDaEI7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUE7QUFpQkQsTUFBYSxlQUFlO0lBTTFCLFlBQVksT0FBZ0I7UUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxrQ0FBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQztRQUN2QyxNQUFNLFNBQVMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksS0FBSyxFQUFFLENBQUM7UUFDbkQsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxPQUFnQixFQUFFLEVBQUU7WUFDakQsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUMvRixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksMkJBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0RyxDQUFDLENBQUM7UUFDRixJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDdkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFBO0lBQ3BDLENBQUM7Q0FDRjtBQWpCRCwwQ0FpQkM7QUFPRCxNQUFhLFVBQVcsU0FBUSxzQkFBTyxDQUFDLFVBQW9EO0lBQTVGOztRQUNFLFNBQUksR0FBRyxNQUFNLENBQUM7SUFxQmhCLENBQUM7SUFwQlcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFzQixFQUFFLElBQVUsRUFBRSxVQUEwQixFQUFFLENBQVU7UUFDakcsTUFBTSxPQUFPLEdBQWU7WUFDMUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLElBQUksWUFBWTtZQUM5QyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsSUFBSSxFQUFFLFVBQVUsQ0FBQyxVQUFVO1lBQzNCLElBQUksRUFBRSxVQUFVLENBQUMsVUFBVTtZQUMzQixPQUFPLEVBQWEsSUFBSSxDQUFDLElBQUssQ0FBQyxJQUFJO1lBQ25DLFNBQVMsRUFBRSxJQUFJO1NBQ2hCLENBQUM7UUFDRixNQUFNLFVBQVUsR0FBRyxNQUFNLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QyxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUM7SUFDeEIsQ0FBQztJQUNTLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBa0IsRUFBRSxJQUFVLEVBQUUsT0FBZ0I7UUFDekUsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxPQUFPO1lBQ0wsVUFBVSxFQUFFLElBQUk7WUFDaEIsVUFBVSxFQUFhLElBQUksQ0FBQyxJQUFLLENBQUMsSUFBSTtTQUN2QyxDQUFDO0lBQ0osQ0FBQztJQUNTLElBQUksQ0FBQyxPQUFnQixJQUFxQixPQUFPLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMzRjtBQXRCRCxnQ0FzQkM7QUFFRCxNQUFhLHNCQUF1QixTQUFRLHNCQUFPLENBQUMsc0JBQXdKO0lBQTVNOztRQUNFLFNBQUksR0FBRyxXQUFXLENBQUM7SUFzQnJCLENBQUM7SUFyQlcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUE0RixFQUFFLElBQVUsRUFBRSxPQUFnQjtRQUNuSixNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELE9BQU87WUFDTCxVQUFVLEVBQUUsSUFBSTtZQUNoQixVQUFVLEVBQWEsSUFBSSxDQUFDLElBQUssQ0FBQyxJQUFJO1NBQ3ZDLENBQUM7SUFDSixDQUFDO0lBQ1MsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQTRGLEVBQUUsSUFBVSxFQUFFLFVBQTBCLEVBQUUsT0FBZ0I7UUFDckwsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckQsT0FBTyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUM7YUFDL0UsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFFLE1BQU0sQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCO0lBQzlGLENBQUM7SUFDUyxJQUFJLENBQUMsT0FBK0I7UUFDNUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ3BELE9BQU87WUFDTCxRQUFRLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO1lBQ3BELGVBQWUsRUFBRSxtQkFBbUI7WUFDcEMsYUFBYSxFQUFFLGlCQUFpQjtTQUNqQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBdkJELHdEQXVCQztBQUVELFNBQWdCLElBQUksQ0FBQyxPQUFpQjtJQUNwQyxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0tBQ2pEO0lBQ0QsbUJBQW1CO0lBQ25CLGdEQUFnRDtJQUNoRCxNQUFNLFlBQVksR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5RCxNQUFNLGdCQUFnQixHQUFHLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUUsT0FBTyx3QkFBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUMzRCxDQUFDO0FBVEQsb0JBU0MifQ==