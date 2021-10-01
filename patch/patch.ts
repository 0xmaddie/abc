import * as block from "../block/mod.ts";
import * as key from "../key/mod.ts";

/**
 * A mutation of an ABC module.
 */
export type Patch<T> =
  | { tag: "nil"; }
  | { tag: "insert";
      key: key.Key;
      value: block.Block<T>; }
  | { tag: "remove";
      key: key.Key; }
  | { tag: "sequence";
      fst: Patch<T>;
      snd: Patch<T>; }

export function nil<T>(): Patch<T> {
  return { tag: "nil" };
}

export function insert<T>(
  key: key.Key,
  value: block.Block<T>,
): Patch<T> {
  return { tag: "insert", key, value };
}

export function remove<T>(
  key: key.Key,
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
      if (!key.equals(fst.key, snd.key)) {
        return false;
      }
      return block.equals(fst.value, snd.value);
    case "remove":
      if (snd.tag !== "remove") {
        return false;
      }
      return key.equals(fst.key, snd.key);
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
