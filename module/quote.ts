import {
  Module,
} from "./module.ts";

import * as patch from "../patch/mod.ts";

/**
 * Return a patch that will reconstruct the given module.
 */
export function quote<T>(
  ctx: Module<T>,
): patch.Patch<T> {
  let buf = [];
  for (const [key, value] of ctx.entries()) {
    buf.push(patch.insert(key, value));
  }
  return patch.sequence(...buf);
}
