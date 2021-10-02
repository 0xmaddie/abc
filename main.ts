import { readAll } from "https://deno.land/std@0.97.0/io/util.ts";

import {
  norm,
  read,
  show,
} from "./block/mod.ts";

const decoder = new TextDecoder();
const stdin = decoder.decode(
  await readAll(Deno.stdin),
);
const source = read(stdin);
for (const event of norm(source)) {
  switch (event.tag) {
    case "request":
      switch (event.method) {
        case "expand-variable":
          event.state.thunk(event.point);
          break;
        case "run-extension":
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
      console.log(show(event.state.value));
      break;
  }
}
