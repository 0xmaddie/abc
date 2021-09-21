import {
  Block,
  constant,
  variable,
  annotation,
  plugin,
  natural,
  keyword,
  quote,
  sequence,
} from "./block.ts";

/**
 * Construct a block from a string.
 */
export function read<T>(
  source: string,
): Block<T> {
  source = source.replaceAll("[", "[ ");
  source = source.replaceAll("]", " ]");
  source = source.replaceAll("\r", " ");
  source = source.replaceAll("\t", " ");
  source = source.replaceAll("\n", " ");
  const tokens = source.split(" ");
  const varP = /^[a-z_][a-z0-9_]*$/;
  const annP = /^@[a-z_][a-z0-9_]*$/;
  const plgP = /^![a-z_][a-z0-9_]*$/;
  const natP = /^(0|[1-9][0-9]*)$/;
  const keyP = /^:[a-z_][a-z0-9_]*$/;
  let stack: Block<T>[][] = [];
  let build: Block<T>[] = [];
  for (const point of tokens) {
    if (point === "[") {
      stack.push(build);
      build = [];
    } else if (point === "]") {
      if (stack.length === 0) {
        throw `unbalanced brackets`;
      }
      const program = quote(sequence(...build));
      build = stack.pop()!;
      build.push(program);
    } else if (
      point === "A" ||
      point === "B" ||
      point === "C" ||
      point === "D" ||
      point === "E" ||
      point === "F"
    ) {
      const program = constant<T>(point);
      build.push(program);
    } else if (varP.test(point)) {
      const program = variable<T>(point);
      build.push(program);
    } else if (annP.test(point)) {
      const name = point.slice(1);
      const program = annotation<T>(name);
      build.push(program);
    } else if (natP.test(point)) {
      const value = BigInt(Number.parseInt(point));
      const program = natural<T>(value);
      build.push(program);
    } else if (keyP.test(point)) {
      const name = point.slice(1);
      const program = keyword<T>(name);
      build.push(program);
    } else if (plgP.test(point)) {
      const name = point.slice(1, point.length);
      const program = plugin<T>(name);
      build.push(program);
    } else if (point.length === 0) {
      //
    } else {
      throw `unknown token: ${point}`;
    }
  }
  if (stack.length > 0) {
    throw `unbalanced brackets`;
  }
  return sequence(...build);
}
