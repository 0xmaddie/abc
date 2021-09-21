import {
  Patch,
} from "./patch.ts";

import {
  Module,
} from "./module.ts";

/**
 * Mutate a module with a patch.
 */
export function runPatch<T>(
  patch: Patch<T>,
  ctx: Module<T>,
): void {
  switch (patch.tag) {
    case "nil":
      //
      break;
    case "insert":
      ctx.set(patch.key, patch.value);
      break;
    case "remove":
      ctx.delete(patch.key);
      break;
    case "sequence":
      runPatch(patch.fst, ctx);
      runPatch(patch.snd, ctx);
      break;
  }
}
