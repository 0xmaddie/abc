import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.97.0/testing/asserts.ts";

import {
  Module,
} from "./module.ts";

import { read } from "./read.ts";
import { show } from "./show.ts";

import * as block from "../block/mod.ts";

Deno.test({
  name: "Module sanity check",
  fn: () => {
    const source = `
foo = 1
bar = [foo bar baz]
baz = [3 4 5]
`;
    const ctx = read(source);
    assert(ctx.has("foo"));
    assert(block.equals(ctx.get("foo")!, block.read("1")));
    assert(ctx.has("bar"));
    assert(block.equals(ctx.get("bar")!, block.read("[foo bar baz]")));
    assert(ctx.has("baz"));
    assert(block.equals(ctx.get("baz")!, block.read("[3 4 5]")));
    assertEquals(source.trim(), show(ctx));
  },
});
