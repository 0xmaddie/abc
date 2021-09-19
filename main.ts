import { readAll } from "https://deno.land/std@0.97.0/io/util.ts";
import { Block } from "./mod.ts";

const decoder = new TextDecoder();
const source = decoder.decode(await readAll(Deno.stdin));
for (const request of Block.norm(source)) {
  switch (request.tag) {
    case "variable":
      request.state.thunk(request.block);
      break;
    case "annotation":
      break;
    case "done":
      console.log(`${request.block}`);
      break;
  }
}
