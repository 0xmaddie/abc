import {
  Module,
} from "./module.ts";

import * as blk from "../block/mod.ts";

/**
 * Return a string representation of a module.
 */
export function show<T>(
  ctx: Module<T>,
): string {
  let buf: string[] = [];
  for (const [key, value] of ctx.entries()) {
    buf.push(`${key} = ${blk.show(value)}`);
  }
  return buf.join("\n");
}
