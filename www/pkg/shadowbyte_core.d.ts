/* tslint:disable */
/* eslint-disable */

/**
 * Hide a binary file inside raw RGBA image bytes.
 */
export function hide_file(rgba: Uint8Array, file_bytes: Uint8Array, password: string): Uint8Array;

/**
 * Hide a text message inside raw RGBA image bytes.
 *
 * `rgba`     — flat RGBA pixel buffer (from canvas.getImageData).
 * `message`  — plaintext to hide.
 * `password` — encryption password.
 *
 * Returns the modified RGBA buffer.
 */
export function hide_text(rgba: Uint8Array, message: string, password: string): Uint8Array;

/**
 * One-time initialization: hook Rust panics into browser console.
 */
export function init(): void;

/**
 * Extract a hidden binary file from raw RGBA image bytes.
 */
export function reveal_file(rgba: Uint8Array, password: string): Uint8Array;

/**
 * Reveal a hidden text message from raw RGBA image bytes.
 */
export function reveal_text(rgba: Uint8Array, password: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly hide_file: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly hide_text: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly init: () => void;
    readonly reveal_file: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly reveal_text: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
