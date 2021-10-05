/**
 * A key within an ABC module.
 */
export type Key =
  | string
  | { tag: "variable"; name: string; }

export function name(key: Key): string {
  if (typeof(key) === "string") {
    return key;
  }
  return key.name;
}

export function equals(
  fst: Key,
  snd: Key,
): boolean {
  return name(fst) === name(snd);
}
