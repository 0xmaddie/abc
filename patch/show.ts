import {
  Patch,
} from "./patch.ts";

import * as key from "../key/mod.ts";
import * as block from "../block/mod.ts";

/**
 * Return a string representation of a patch.
 */
export function show<T>(
  patch: Patch<T>,
): string {
  switch (patch.tag) {
    case "nil": {
      return "";
    }
    case "insert": {
      const point = key.name(patch.key);
      const value = block.show(patch.value);
      return `+${point} ${value}`;
    }
    case "remove": {
      const point = key.name(patch.key);
      return `-${point}`;
    }
    case "sequence": {
      const fst = show(patch.fst);
      const snd = show(patch.snd);
      return `${fst}\n${snd}`;
    }
  }
}
