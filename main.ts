import { readAll } from "https://deno.land/std@0.97.0/io/util.ts";
import { Block } from "./mod.ts";

const decoder = new TextDecoder();
const bytes   = await readAll(Deno.stdin);
const input   = decoder.decode(bytes);
const source  = Block.fromString(input);
const target  = source.norm();
const output  = target.toString();
console.log(output);
