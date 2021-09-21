import {
  Module,
} from "./module.ts";

import {
  Patch,
  insert,
  sequence,
} from "./patch.ts";

/**
 * Return a patch that will reconstruct the given module.
 */
export function quoteModule<T>(
  ctx: Module<T>,
): Patch<T> {
  let buf = [];
  for (const [key, value] of ctx.entries()) {
    buf.push(insert(key, value));
  }
  return sequence(...buf);
}
