import {
  Term,
} from "./term.ts";

export class ReadError {
  source: string;
  tokens: string[];
  index: number;
  message: string;

  constructor(
    source: string,
    tokens: string[],
    index: number,
    message: string,
  ) {
    this.source = source;
    this.tokens = tokens;
    this.index = index;
    this.message = message;
  }

  toString(): string {
    const position = this.tokens[this.index];
    return `While reading ${this.source}\nat token ${position}:\n${this.message}`;
  }
}

export function read(
  source: string,
): Term {
  source = source.replaceAll("[", "[ ");
  source = source.replaceAll("]", " ]");
  source = source.replaceAll("\r", " ");
  source = source.replaceAll("\t", " ");
  source = source.replaceAll("\n", " ");
  const tokens = source.split(" ");
  const constP = /^[A-Z]$/;
  const varP = /^[a-z_][a-z0-9_]*$/;
  let stack: Term[][] = [];
  let build: Term[] = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === "[") {
      stack.push(build);
      build = [];
      index++;
    } else if (token === "]") {
      if (stack.length === 0) {
        throw new ReadError(
          source,
          tokens,
          index,
          "unbalanced brackets",
        );
      }
      const program = Term.fromArray(build).quote();
      build = stack.pop()!;
      build.push(program);
      index++;
    } else if (constP.test(token)) {
      const program = Term.constant(token);
      build.push(program);
      index++;
    } else if (varP.test(token)) {
      const program = Term.variable(token);
      build.push(program);
      index++;
    } else if (token.length === 0) {
      index++;
    } else {
      throw new ReadError(
        source,
        tokens,
        index,
        "unknown token",
      );
    }
  }
  if (stack.length > 0) {
    throw new ReadError(
      source,
      tokens,
      index,
      "unbalanced brackets",
    );
  }
  return Term.fromArray(build);
}
