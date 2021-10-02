import {
  Block,
  natural,
  variable,
  quote,
  sequence,
  KEYWORD_LENGTH,
} from "./block.ts";

/**
 * Change the representation of special blocks like nautral numbers
 * and keywords. Natural numbers are compressed applications of the
 * variables `zero` and `succ`, and keywords are binary trees of
 * natural numbers corresponding to the 64 bytes in their value.
 */
export function expand<T>(
  block: Block<T>,
): Block<T> {
  // TODO: Make sure keywords are always UTF-8, right now I don't
  // handle special string stuff at all.
  switch (block.tag) {
    case "id":
      return block;
    case "constant":
      return block;
    case "variable":
      return block;
    case "annotation":
      return block;
    case "extension":
      return block;
    case "natural":{
      let state = quote(variable<T>("zero"));
      for (let i = 0n; i < block.value; ++i) {
        state = quote(
          sequence(state, variable<T>("succ")),
        );
      }
      return state;
    }
    case "keyword": {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(
        block.value.padEnd(KEYWORD_LENGTH, "\0"),
      );
      return byteTree(bytes);
    }
    case "embed":
      return block;
    case "quote":
      return quote(
        expand(block.body),
      );
    case "sequence":
      return sequence(
        expand(block.fst),
        expand(block.snd),
      );
  }
}

function byteTree<T>(
  buffer: Uint8Array,
): Block<T> {
  if (buffer.length === 2) {
    const fst = natural<T>(BigInt(buffer[0]));
    const snd = natural<T>(BigInt(buffer[1]));
    return quote(sequence(fst, snd));
  }
  const midpoint = buffer.length/2;
  const lhs = buffer.subarray(0, midpoint);
  const rhs = buffer.subarray(midpoint);
  const fst = byteTree<T>(lhs);
  const snd = byteTree<T>(rhs);
  return quote(sequence(fst, snd));
}
