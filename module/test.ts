import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

import {
  Module,
} from "./module.ts";

import {
  apply,
} from "./apply.ts";

import * as block from "../block/mod.ts";
import * as patch from "../patch/mod.ts";

Deno.test({
  name: "Module sanity check",
  fn: () => {
    const source = `
+foo 1
+bar [foo bar baz]
+baz [3 4 5]
`;
    const ctx = new Module();
    const point = patch.read(source);
    assertEquals(patch.show(point), source.trim());
    apply(point, ctx);
    assert(ctx.has("foo"));
    assert(block.equals(ctx.get("foo")!, block.read("1")));
    assert(ctx.has("bar"));
    assert(block.equals(ctx.get("bar")!, block.read("[foo bar baz]")));
    assert(ctx.has("baz"));
    assert(block.equals(ctx.get("baz")!, block.read("[3 4 5]")));
  },
});
