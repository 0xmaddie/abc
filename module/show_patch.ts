import {
  Patch,
} from "./patch.ts";

import {
  getKey,
} from "./key.ts";

import {
  show as showBlock,
} from "../block/mod.ts";

/**
 * Return a string representation of a patch.
 */
export function showPatch<T>(
  patch: Patch<T>,
): string {
  switch (patch.tag) {
    case "nil": {
      return "";
    }
    case "insert": {
      const key = getKey(patch.key);
      const value = showBlock(patch.value);
      return `+${key} ${value}`;
    }
    case "remove": {
      const key = getKey(patch.key);
      return `-${key}`;
    }
    case "sequence": {
      const fst = showPatch(patch.fst);
      const snd = showPatch(patch.snd);
      return `${fst}\n${snd}`;
    }
  }
}
