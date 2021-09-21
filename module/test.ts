import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

import {
  Module,
  readPatch,
  showPatch,
  runPatch,
} from "./mod.ts";

import {
  read as readBlock,
  equals as equalsBlock,
} from "../block/mod.ts";

Deno.test({
  name: "Module sanity check",
  fn: () => {
    const source = `
+foo 1
+bar [foo bar baz]
+baz [3 4 5]
`;
    const ctx = new Module();
    const patch = readPatch(source);
    assertEquals(showPatch(patch), source.trim());
    runPatch(patch, ctx);
    assert(ctx.has("foo"));
    assert(equalsBlock(
      ctx.get("foo"),
      readBlock("1"),
    ));
    assert(ctx.has("bar"));
    assert(equalsBlock(
      ctx.get("bar"),
      readBlock("[foo bar baz]"),
    ));
    assert(ctx.has("baz"));
    assert(equalsBlock(
      ctx.get("baz"),
      readBlock("[3 4 5]"),
    ));
  },
});
