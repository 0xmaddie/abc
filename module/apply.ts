import {
  Module,
} from "./module.ts";

import * as patch from "../patch/mod.ts";

/**
 * Mutate a module with a patch.
 */
export function apply<T>(
  point: patch.Patch<T>,
  ctx: Module<T>,
): void {
  switch (point.tag) {
    case "nil":
      //
      break;
    case "insert":
      ctx.set(point.key, point.value);
      break;
    case "remove":
      ctx.delete(point.key);
      break;
    case "sequence":
      apply(point.fst, ctx);
      apply(point.snd, ctx);
      break;
  }
}
