import {
  Module,
} from "./module.ts";

import {
  apply,
} from "./apply.ts";

import * as patch from "../patch/mod.ts";

/**
 * Construct a module from a string.
 */
export function read<T>(
  source: string,
): Module<T> {
  let ctx = new Module<T>();
  apply<T>(patch.read<T>(source), ctx);
  return ctx;
}
