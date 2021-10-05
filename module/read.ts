import {
  Module,
} from "./module.ts";

import * as blk from "../block/mod.ts";

/**
 * Construct a module from a string.
 */
export function read<T>(
  source: string,
): Module<T> {
  let db = new Module<T>();
  const lines = source.split("\n");
  for (const line of lines) {
    if (line === "") {
      continue;
    }
    const parts = line.split("=");
    if (parts.length !== 2) {
      throw `read: invalid line: ${line}`;
    }
    const name = blk.read<T>(parts[0]);
    if (name.tag !== "variable") {
      throw `read: invalid name: ${parts[0]}`;
    }
    const body = blk.read<T>(parts[1]);
    db.set(name, body);
  }
  return db;
}
