/**
 * A block is the fundamental unit of code in ABC.
 */
export type Block<T> =
  | { tag: "id" }
  | { tag: "constant";
      name: "A" | "B" | "C" | "D" | "E" | "F"; }
  | { tag: "variable"; name: string; }
  | { tag: "annotation"; name: string; }
  | { tag: "extension"; name: string; }
  | { tag: "natural"; value: bigint; }
  | { tag: "keyword"; value: string; }
  | { tag: "embed"; value: T; }
  | { tag: "quote"; body: Block<T>; }
  | { tag: "sequence";
      fst: Block<T>; snd: Block<T>; }

/**
 * The identity function, the unit for sequential composition.
 */
export function id<T>(): Block<T> {
  return { tag: "id" };
}

/**
 * ABC has six primitive combinators:
 *
 * The `A` combinator applies a block to the stack:
 *
 *     [foo] A = foo
 *
 * The `B` combinator wraps the block on the top of the stack in
 * another layer of brackets:
 *
 *     [foo] B = [[foo]]
 *
 * The `C` combinator composes the two blocks on top of the stack:
 *
 *     [foo] [bar] C = [foo bar]
 *
 * The `D` combinator duplicates the block on top of the stack:
 *
 *     [foo] D = [foo] [foo]
 *
 * The `E` combinator erases the block on top of the stack:
 *
 *     [foo] E =
 *
 * The `F` combinator swaps the two blocks on top of the stack:
 *
 *     [foo] [bar] F = [bar] [foo]
 *
 * Together, these combinators form a universal ("Turing-complete")
 * basis for computation.
 */
export function constant<T>(
  name: "A" | "B" | "C" | "D" | "E" | "F",
): Block<T> {
  return { tag: "constant", name };
}

/**
 * Variables are replaced with their definitions during normalization.
 */
export function variable<T>(
  name: string,
): Block<T> {
  return { tag: "variable", name };
}

/**
 * An annotation acts like the identity function, and provides some
 * signal to the runtime that changes the style of evaluation.
 */
export function annotation<T>(
  name: string,
): Block<T> {
  return { tag: "annotation", name };
}

/**
 * Access to special functions provided by the runtime. Generally
 * these will not have visible side effects, in order to preserve
 * causal commutativity; they'll just manipulate low level
 * representations, as opposed to blocks.
 */
export function extension<T>(
  name: string,
): Block<T> {
  return { tag: "extension", name };
}

/**
 * ABC does not have sophisticated number types. As a compromise, it
 * provides a syntax for natural numbers, using a user-defined
 * representation through the variables `zero` and `succ`: the natural
 * number 0 is represented as the block `[zero]`, 1 as `[[zero]
 * succ]`, and so on. For performance, this representation should be
 * recognized and replaced with efficient code by a software
 * accelerator.
 */
export function natural<T>(
  value: bigint,
): Block<T> {
  return { tag: "natural", value };
}

export const KEYWORD_LENGTH = 64;

/**
 * A keyword is a simple form of "string" that does not complicate the
 * grammar. Keywords can be a maximum of 64 characters and use the
 * same legal character set as variables.
 */
export function keyword<T>(
  value: string,
): Block<T> {
  if (value.length > KEYWORD_LENGTH) {
    throw `keywords have a maximum length of ${KEYWORD_LENGTH}`;
  }
  return {
    tag: "keyword",
    value,
  };
}

/**
 * Embedded values allow downstream applications to inject
 * application-specific types in to blocks.
 */
export function embed<T>(
  value: T,
): Block<T> {
  return { tag: "embed", value }
}

/**
 * The use/mention distinction for blocks. This creates a function
 * that evaluates to the block provided as an argument.
 */
export function quote<T>(
  body: Block<T>,
): Block<T> {
  return { tag: "quote", body };
}

/**
 * A sequential composition of blocks. When applied to the stack, a
 * sequence will apply its component blocks from left to right.
 */
export function sequence<T>(
  ...xs: Block<T>[]
): Block<T> {
  let state: Block<T> = id<T>();
  for (let i = xs.length-1; i >= 0; --i) {
    state = _sequence(xs[i], state);
  }
  return state;
}

/**
 * Predicates equality of two blocks.
 */
export function equals<T>(
  fst: Block<T>,
  snd: Block<T>,
  xequals?: (lhs: T, rhs: T) => boolean,
): boolean {
  switch (fst.tag) {
    case "id":
      return snd.tag === "id";
    case "constant":
      if (snd.tag !== "constant") {
        return false;
      }
      return fst.name === snd.name;
    case "variable":
      if (snd.tag !== "variable") {
        return false;
      }
      return fst.name === snd.name;
    case "annotation":
      if (snd.tag !== "annotation") {
        return false;
      }
      return fst.name === snd.name;
    case "extension":
      if (snd.tag !== "extension") {
        return false;
      }
      return fst.name === snd.name;
    case "natural":
      if (snd.tag !== "natural") {
        return false;
      }
      return fst.value === snd.value;
    case "keyword":
      if (snd.tag !== "keyword") {
        return false;
      }
      return fst.value === snd.value;
    case "embed":
      if (snd.tag !== "embed") {
        return false;
      }
      if (xequals) {
        return xequals(fst.value, snd.value);
      }
      return fst.value === snd.value;
    case "quote":
      if (snd.tag !== "quote") {
        return false;
      }
      return equals(fst.body, snd.body);
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

function _sequence<T>(
  fst: Block<T>,
  snd: Block<T>,
): Block<T> {
  if (snd.tag === "id") {
    return fst;
  }
  if (fst.tag === "id") {
    return snd;
  }
  if (fst.tag === "sequence") {
    return _sequence(fst.fst, _sequence(fst.snd, snd));
  }
  return { tag: "sequence", fst, snd };
}
