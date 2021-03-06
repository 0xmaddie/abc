import {
  Block,
} from "./block.ts";

/**
 * Represent a block as a string.
 */
export function show<T>(
  block: Block<T>,
  showEmbed?: (value: T) => string,
): string {
  switch (block.tag) {
    case "id":
      return "";
    case "constant":
      return block.name;
    case "variable":
      return block.name;
    case "annotation":
      return `@${block.name}`;
    case "extension":
      return `${block.name}`;
    case "natural":
      return `${block.value}`;
    case "embed":
      if (showEmbed) {
        return `#<${showEmbed(block.value)}>`;
      } else {
        return `#<${block.value}>`;
      }
    case "keyword":
      return `:${block.value}`;
    case "quote":
      const body = show(block.body, showEmbed);
      return `[${body}]`;
    case "sequence":
      const fst = show(block.fst, showEmbed);
      const snd = show(block.snd, showEmbed);
      return `${fst} ${snd}`;
    default:
      return _unreachable();
  }
}

function _unreachable(): never {
  throw `unreachable`;
}
