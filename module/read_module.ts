import {
  Module,
} from "./module.ts";

import {
  readPatch,
} from "./read_patch.ts";

import {
  runPatch,
} from "./run_patch.ts";

/**
 * Construct a module from a string.
 */
export function readModule<T>(
  source: string,
): Module<T> {
  let ctx = new Module<T>();
  runPatch<T>(readPatch<T>(source), ctx);
  return ctx;
}
