import {
  Module,
} from "./module.ts";

import {
  quote,
} from "./quote.ts";

import * as patch from "../patch/mod.ts";

/**
 * Return a string representation of a module.
 */
export function show<T>(
  ctx: Module<T>,
): string {
  return patch.show(quote(ctx));
}
