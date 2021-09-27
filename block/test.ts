import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

import {
  Block,
  read,
  show,
  norm,
  expand,
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
      ["@foo", ""],
      ["!foo", "!foo"],
      ["[@foo]", "[@foo]"],
      ["1337", "1337"],
      [":foo", ":foo"],
    ];
    console.log();
    for (const [source, expected] of axioms) {
      const initial = read(source);
      for (const event of norm(initial)) {
        switch (event.tag) {
          case "request":
            switch (event.method) {
              case "use-annotation":
                //
                break;
              case "expand-variable":
                event.state.thunk(event.point);
                break;
              case "run-plugin":
                event.state.thunk(event.point);
                break;
            }
            break;
          case "condition":
            throw `condition: ${event.method}`;
          case "done":
            const actual = show(event.state.value);
            assertEquals(
              expected,
              actual,
              `
Expected: ${source} => ${expected}
  Actual: ${source} => ${actual}
`);
            console.log(`${source} => ${actual}`);
            break;
        }
      }
    }
  },
});

Deno.test({
  name: "Expand keywords",
  fn: () => {
    const source = ":foo";
    const actual = show(expand(read(source)));
    console.log(`\n${source} => ${actual}`);
  },
});
