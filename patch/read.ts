import {
  Patch,
  nil,
  insert,
  remove,
  sequence,
} from "./patch.ts";

import * as block from "../block/mod.ts";

/**
 * Construct a patch from a string.
 */
export function read<T>(
  source: string,
): Patch<T> {
  const setP = /^\+[a-z_][a-z0-9_]* /;
  const deleteP = /^-[a-z_][a-z0-9_]*$/;
  const buf = [];
  for (const line of source.split("\n")) {
    if (setP.test(line)) {
      const space = line.indexOf(" ");
      const key = line.slice(1, space);
      const rest = line.slice(space+1);
      const value = block.read<T>(rest);
      buf.push(insert<T>(key, value));
    } else if (deleteP.test(line)) {
      const space = line.indexOf(" ");
      const key = line.slice(1, space);
      buf.push(remove<T>(key));
    } else if (line.length === 0) {
      continue;
    } else {
      throw `couldn't read line ${line}`;
    }
  }
  let state = nil<T>();
  for (let i = buf.length-1; i >= 0; --i) {
    state = sequence<T>(buf[i], state);
  }
  return state;
}
