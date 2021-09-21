import {
  Module,
} from "./module.ts";

import {
  quoteModule,
} from "./quote_module.ts";

import {
  showPatch,
} from "./show_patch.ts";

/**
 * Return a string representation of a module, that can be given to
 * `readModule`.
 */
export function showModule<T>(
  ctx: Module<T>,
): string {
  return showPatch(quoteModule(ctx));
}
