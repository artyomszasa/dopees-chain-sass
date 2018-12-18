/// <reference types="node" />
import { Executor, Task, Context, ReversePathResolverConfig, derived, PathResolver } from 'dopees-chain';
export interface Options extends ReversePathResolverConfig {
    targetRoot: string;
    subfolders?: boolean;
    includePaths?: string[];
    outputStyle?: "compact" | "compressed" | "expanded" | "nested";
    precision?: number;
    persists?: boolean;
}
export declare class SassMapperState implements derived.FileMapperState {
    sourceResolver: PathResolver;
    innerStateKey: string;
    selector: (path: string, context: Context) => boolean;
    outputStyle?: "compact" | "compressed" | "expanded" | "nested";
    precision?: number;
    constructor(options: Options);
}
interface SassInnerState {
    readonly sourceCode: string;
    readonly sourcePath: string;
}
export declare class SassMapper extends derived.FileMapper<Options, SassInnerState, SassMapperState> {
    name: string;
    protected generate(state: SassMapperState, task: Task, innerState: SassInnerState, _: Context): Promise<Buffer>;
    protected readSource(_: SassMapperState, task: Task, context: Context): Promise<{
        sourceCode: string;
        sourcePath: string;
    }>;
    protected init(options: Options): SassMapperState;
}
export declare class SassDependencyResolver extends derived.FileDependencyResolver<{
    sourceExt?: string;
}, SassInnerState, derived.FileDependencyResolverState & {
    innerStateKey: string;
    dependenciesKey: string;
}> {
    name: string;
    protected readSource(_: derived.FileDependencyResolverState & {
        innerStateKey: string;
        dependenciesKey: string;
    }, task: Task, context: Context): Promise<SassInnerState>;
    protected readDependencies(_: derived.FileDependencyResolverState & {
        innerStateKey: string;
        dependenciesKey: string;
    }, task: Task, innerState: SassInnerState, context: Context): Promise<string[]>;
    protected init(options: {
        sourceExt?: string;
    }): derived.FileDependencyResolverState & {
        innerStateKey: string;
        dependenciesKey: string;
    };
}
export declare function sass(options?: Options): Executor;
export {};
