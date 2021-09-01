import {
  //assert,
  assertEquals,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

import { Block } from "./mod.ts";

Deno.test({
  name: "ABC axioms",
  fn: (): void => {
    const axioms = [
      ["[foo] A", "foo"],
      ["[foo] B", "[[foo]]"],
      ["[foo] [bar] C", "[foo bar]"],
      ["[foo] D", "[foo] [foo]"],
      ["[foo] E", ""],
      ["[foo] [bar] F", "[bar] [foo]"],
      ["[foo] S bar R", "[bar] foo"],
      ["@foo", ""],
      ["[@foo]", "[@foo]"],
      ["[foo] !", "[foo] !"],
    ];
    console.log();
    for (const [source, expected] of axioms) {
      let target: Block;
      for (const request of Block.fromString(source).norm()) {
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
      const actual = target!.toString();
      assertEquals(
        expected,
        actual,
        `expected "${source} => ${expected}" but got "${source} => ${actual}"`,
      );
      console.log(`${source} => ${actual}`);
    }
  },
});
