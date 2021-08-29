import {
  //assert,
  assertEquals,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

import {
  read,
  norm,
} from "./mod.ts";

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
    ];
    console.log();
    for (const [source, expected] of axioms) {
      const actual = `${norm(read(source))}`;
      assertEquals(
        expected, actual,
        `expected "${source} => ${expected}" but got "${source} => ${actual}"`,
      );
      console.log(`${source} => ${actual}`);
    }
  },
});
