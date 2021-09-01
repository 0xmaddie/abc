import { readAll } from "https://deno.land/std@0.97.0/io/util.ts";
import { Block } from "./mod.ts";

const decoder = new TextDecoder();
const bytes = await readAll(Deno.stdin);
const input = decoder.decode(bytes);
const source = Block.fromString(input);
let target: Block;
for (const request of source.norm()) {
  switch (request.tag) {
    case "bang":
    case "variable":
      request.state.thunk(request.block);
      break;
    case "annotation":
      break;
    case "done":
      target = request.block;
      break;
  }
}
const output = target!.toString();
console.log(output);
