import { readAll } from "https://deno.land/std@0.97.0/io/util.ts";

import {
  norm,
  readBlock,
  showBlock,
} from "./mod.ts";

const decoder = new TextDecoder();
const stdin = decoder.decode(
  await readAll(Deno.stdin),
);
const source = readBlock(stdin);
for (const event of norm(source)) {
  switch (event.tag) {
    case "request":
      switch (event.method) {
        case "expand-variable":
          event.state.thunk(event.point);
          break;
        case "run-plugin":
          event.state.thunk(event.point);
          break;
        case "use-annotation":
          //
          break;
      }
      break;
    case "condition":
      throw `condition: ${event.method}`;
    case "done":
      console.log(showBlock(event.value));
      break;
  }
}
