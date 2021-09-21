import {
  Block,
  equals as equalsBlock,
} from "../block/mod.ts";

import {
  Key,
  equals as equalsKey,
} from "./key.ts";

/**
 * A mutation of an ABC module.
 */
export type Patch<T> =
  | { tag: "nil"; }
  | { tag: "insert"; key: Key; value: Block<T>; }
  | { tag: "remove"; key: Key; }
  | { tag: "sequence"; fst: Patch<T>; snd: Patch<T>; }

export function nil<T>(): Patch<T> {
  return { tag: "nil" };
}

export function insert<T>(
  key: Key,
  value: Block<T>,
): Patch<T> {
  return { tag: "insert", key, value };
}

export function remove<T>(
  key: Key,
): Patch<T> {
  return { tag: "remove", key };
}

export function sequence<T>(
  ...xs: Patch<T>[]
): Patch<T> {
  let state: Patch<T> = nil<T>();
  for (let i = xs.length-1; i >= 0; --i) {
    state = _sequence(xs[i], state);
  }
  return state;
}

function _sequence<T>(
  fst: Patch<T>,
  snd: Patch<T>,
): Patch<T> {
  if (snd.tag === "nil") {
    return fst;
  }
  if (fst.tag === "nil") {
    return snd;
  }
  if (fst.tag === "sequence") {
    return _sequence(
      fst.fst, _sequence(fst.snd, snd),
    );
  }
  return { tag: "sequence", fst, snd };
}

export function equals<T>(
  fst: Patch<T>,
  snd: Patch<T>,
): boolean {
  switch (fst.tag) {
    case "nil":
      return snd.tag === "nil";
    case "insert":
      if (snd.tag !== "insert") {
        return false;
      }
      if (!equalsKey(fst.key, snd.key)) {
        return false;
      }
      return equalsBlock(fst.value, snd.value);
    case "remove":
      if (snd.tag !== "remove") {
        return false;
      }
      return equalsKey(fst.key, snd.key);
    case "sequence":
      if (snd.tag !== "sequence") {
        return false;
      }
      if (!equals(fst.fst, snd.fst)) {
        return false;
      }
      return equals(fst.snd, snd.snd);
  }
}
