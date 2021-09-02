export abstract class Block {
  get name(): string {
    throw `${this} does not have a "name" property`;
  }

  get value(): bigint {
    throw `${this} is not a number`;
  }

  get body(): Block {
    throw `${this} is not a quote`;
  }

  get fst(): Block {
    throw `${this} is not a sequence`;
  }

  get snd(): Block {
    throw `${this} is not a sequence`;
  }

  expand(): Block {
    return this;
  }

  quote(): Block {
    return new Quote(this);
  }

  seq(rhs: Block): Block {
    if (rhs instanceof Id) {
      return this;
    }
    return new Sequence(this, rhs);
  }

  *norm(): Generator<NormFx> {
    let state = new State(this);
    while (state.isNotDone) {
      const block = state.code.pop();
      if (block instanceof Id) {
        //
      } else if (block instanceof Quote) {
        state.data.push(block);
      } else if (block instanceof Sequence) {
        state.code.push(block.snd);
        state.code.push(block.fst);
      } else if (block instanceof Bang) {
        yield { tag: "bang", block, state };
      } else if (block instanceof Annotation) {
        yield { tag: "annotation", block, state };
      } else if (block instanceof Variable) {
        yield { tag: "variable", block, state };
      } else if (block instanceof Constant) {
        switch (block.name) {
          case "A": {
            const source = state.data.top1;
            state.code.push(source.body);
            state.data.pop();
            break;
          }
          case "B": {
            const source = state.data.top1;
            const target = source.quote();
            state.data.pop();
            state.data.push(target);
            break;
          }
          case "C": {
            const snd = state.data.top1;
            const fst = state.data.top2;
            const body = fst.body.seq(snd.body);
            const target = body.quote();
            state.data.pop();
            state.data.pop();
            state.data.push(target);
            break;
          }
          case "D": {
            state.data.push(state.data.top1);
            break;
          }
          case "E": {
            state.data.pop();
            break;
          }
          case "F": {
            const fst = state.data.top1;
            const snd = state.data.top2;
            state.data.pop();
            state.data.pop();
            state.data.push(fst);
            state.data.push(snd);
            break;
          }
          case "R": {
            state.thunk(block);
            break;
          }
          case "S": {
            const client = state.data.top1.body;
            let buffer = [];
            let found_reset = false;
            while (
              state.code.isNotEmpty &&
              !found_reset
            ) {
              const needle = state.code.pop();
              if (
                needle instanceof Constant &&
                needle.name === "R"
              ) {
                found_reset = true;
              } else if (needle instanceof Sequence) {
                state.code.push(needle.snd);
                state.code.push(needle.fst);
              } else {
                buffer.push(needle);
              }
            }
            if (found_reset) {
              const action = Block.fromArray(buffer).quote();
              state.data.pop();
              state.data.push(action);
              state.code.push(client);
            } else {
              buffer.reverse();
              state.code.buffer = buffer;
              state.bail(block);
            }
            break;
          }
        }
      } else {
        state.thunk(block);
      }
    }
    yield { tag: "done", block: state.value };
  }

  toArray(): Block[] {
    return [this];
  }

  abstract equals(rhs: Block): boolean;

  static get id(): Block {
    return new Id();
  }

  static get bang(): Block {
    return new Bang();
  }

  static constant(name: string): Block {
    return new Constant(name);
  }

  static variable(name: string): Block {
    return new Variable(name);
  }

  static natural(value: bigint): Block {
    return new Natural(value);
  }

  static keyword(name: string): Block {
    return new Keyword(name);
  }

  static annotation(name: string): Block {
    return new Annotation(name);
  }

  static isId(block: Block): boolean {
    return block instanceof Id;
  }

  static isConstant(block: Block): boolean {
    return block instanceof Constant;
  }

  static isVariable(block: Block): boolean {
    return block instanceof Variable;
  }

  static isNatural(block: Block): boolean {
    return block instanceof Natural;
  }

  static isKeyword(block: Block): boolean {
    return block instanceof Keyword;
  }

  static isQuote(block: Block): boolean {
    return block instanceof Quote;
  }

  static isSequence(block: Block): boolean {
    return block instanceof Sequence;
  }

  static isAnnotation(block: Block): boolean {
    return block instanceof Annotation;
  }

  static isBang(block: Block): boolean {
    return block instanceof Bang;
  }

  static fromArray(xs: Block[]): Block {
    let state: Block = new Id();
    for (let i = xs.length - 1; i >= 0; --i) {
      state = xs[i].seq(state);
    }
    return state;
  }

  static fromString(source: string): Block {
    source = source.replaceAll("[", "[ ");
    source = source.replaceAll("]", " ]");
    source = source.replaceAll("\r", " ");
    source = source.replaceAll("\t", " ");
    source = source.replaceAll("\n", " ");
    const tokens = source.split(" ");
    const constP = /^[A-Z]$/;
    const varP = /^[a-z_][a-z0-9_]*$/;
    const annP = /^@[a-z_][a-z0-9_]*$/;
    const natP = /^(0|[1-9][0-9]*)$/;
    const keyP = /^:[a-z_][a-z0-9_]*$/;
    let stack: Block[][] = [];
    let build: Block[] = [];
    let index = 0;
    while (index < tokens.length) {
      const token = tokens[index];
      if (token === "[") {
        stack.push(build);
        build = [];
        index++;
      } else if (token === "]") {
        if (stack.length === 0) {
          throw new ReadError(
            source,
            tokens,
            index,
            "unbalanced brackets",
          );
        }
        const program = Block
          .fromArray(build)
          .quote();
        build = stack.pop()!;
        build.push(program);
        index++;
      } else if (constP.test(token)) {
        const program = Block.constant(token);
        build.push(program);
        index++;
      } else if (varP.test(token)) {
        const program = Block.variable(token);
        build.push(program);
        index++;
      } else if (annP.test(token)) {
        const name = token.slice(1);
        const program = Block.annotation(name);
        build.push(program);
        index++;
      } else if (natP.test(token)) {
        const value = BigInt(Number.parseInt(token));
        const program = Block.natural(value);
        build.push(program);
        index++;
      } else if (keyP.test(token)) {
        const name = token.slice(1);
        const program = Block.keyword(name);
        build.push(program);
        index++;
      } else if (token === "!") {
        const program = Block.bang;
        build.push(program);
        index++;
      } else if (token.length === 0) {
        index++;
      } else {
        throw new ReadError(
          source,
          tokens,
          index,
          "unknown token",
        );
      }
    }
    if (stack.length > 0) {
      throw new ReadError(
        source,
        tokens,
        index,
        "unbalanced brackets",
      );
    }
    return Block.fromArray(build);
  }

  static norm(source: string): Generator<NormFx> {
    return Block.fromString(source).norm();
  }
}

class Id extends Block {
  constructor() {
    super();
  }

  seq(rhs: Block): Block {
    return rhs;
  }

  equals(rhs: Block): boolean {
    return rhs instanceof Id;
  }

  toString(): string {
    return "";
  }
}

class Constant extends Block {
  _name: string;

  constructor(name: string) {
    super();
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  equals(rhs: Block): boolean {
    if (rhs instanceof Constant) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return this.name;
  }
}

class Variable extends Block {
  _name: string;

  constructor(name: string) {
    super();
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  equals(rhs: Block): boolean {
    if (rhs instanceof Variable) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return this.name;
  }
}

class Natural extends Block {
  _value: bigint;

  constructor(value: bigint) {
    super();
    this._value = value;
  }

  get value(): bigint {
    return this._value;
  }

  expand(): Block {
    let block = Block.variable("zero").quote();
    for (let i = 0n; i < this.value; ++i) {
      block = block
        .seq(Block.variable("succ"))
        .quote();
    }
    return block;
  }

  equals(rhs: Block): boolean {
    if (rhs instanceof Natural) {
      return this.value === rhs.value;
    }
    return false;
  }

  toString(): string {
    return `${this.value}`;
  }
}

function toTree(
  buffer: Uint8Array,
): Block {
  if (buffer.length === 2) {
    const fst = Block.natural(BigInt(buffer[0]));
    const snd = Block.natural(BigInt(buffer[1]));
    return fst.seq(snd).quote();
  }
  const midpoint = buffer.length/2;
  const lhs = buffer.subarray(0, midpoint);
  const rhs = buffer.subarray(midpoint);
  const fst = toTree(lhs);
  const snd = toTree(rhs);
  return fst.seq(snd).quote();
}

class Keyword extends Block {
  _name: string;

  constructor(name: string) {
    super();
    if (name.length > 32) {
      throw `keywords must be 32 bytes or less`;
    }
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  expand(): Block {
    const encoder = new TextEncoder();
    const bytes = new Uint8Array(32);
    const raw = encoder.encode(this.name);
    for (let i = 0; i < raw.length; ++i) {
      bytes[i] = raw[i];
    }
    return toTree(bytes);
  }

  equals(rhs: Block): boolean {
    if (rhs instanceof Keyword) {
      return this.name === rhs.name;
    }
    return false;
  }

  toString(): string {
    return `:${this.name}`;
  }
}

class Quote extends Block {
  _body: Block;

  constructor(body: Block) {
    super();
    this._body = body;
  }

  get body(): Block {
    return this._body;
  }

  equals(rhs: Block): boolean {
    if (rhs instanceof Quote) {
      return this._body.equals(rhs._body);
    }
    return false;
  }

  toString(): string {
    return `[${this.body}]`;
  }
}

class Sequence extends Block {
  _fst: Block;
  _snd: Block;

  constructor(
    fst: Block,
    snd: Block,
  ) {
    super();
    this._fst = fst;
    this._snd = snd;
  }

  get fst(): Block {
    return this._fst;
  }

  get snd(): Block {
    return this._snd;
  }

  seq(rhs: Block): Block {
    if (rhs instanceof Id) {
      return this;
    }
    return this._fst.seq(this._snd.seq(rhs));
  }

  equals(rhs: Block): boolean {
    if (rhs instanceof Sequence) {
      if (this._fst.equals(rhs._fst)) {
        return this._snd.equals(rhs._snd);
      }
    }
    return false;
  }

  toArray(): Block[] {
    let buffer = [];
    let xs: Block = this;
    while (xs instanceof Sequence) {
      buffer.push(xs.fst);
      xs = xs.snd;
    }
    return buffer;
  }

  toString(): string {
    return `${this.fst} ${this.snd}`;
  }
}

class Annotation extends Block {
  _name: string;

  constructor(name: string) {
    super();
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  equals(rhs: Block): boolean {
    if (rhs instanceof Annotation) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return `@${this._name}`;
  }
}

class Bang extends Block {
  constructor() {
    super();
  }

  equals(rhs: Block): boolean {
    return rhs instanceof Bang;
  }

  toString(): string {
    return "!";
  }
}

export class Stack {
  buffer: Block[];

  constructor() {
    this.buffer = [];
  }

  get length(): number {
    return this.buffer.length;
  }

  get isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  get isNotEmpty(): boolean {
    return this.buffer.length !== 0;
  }

  get top1(): Block {
    return this.buffer[this.buffer.length - 1];
  }

  get top2(): Block {
    return this.buffer[this.buffer.length - 2];
  }

  pop(): Block {
    return this.buffer.pop()!;
  }

  push(block: Block): void {
    this.buffer.push(block);
  }

  append(rhs: Stack): void {
    this.buffer = this.buffer.concat(rhs.buffer);
    rhs.buffer = [];
  }
}

export class State {
  code: Stack;
  data: Stack;
  kill: Stack;

  constructor(initial: Block) {
    this.code = new Stack();
    this.data = new Stack();
    this.kill = new Stack();
    this.code.push(initial);
  }

  get value(): Block {
    const code = this.code.buffer.slice();
    code.reverse();
    const buffer = this.kill.buffer.concat(
      this.data.buffer,
      code,
    );
    return Block.fromArray(buffer);
  }

  get isDone(): boolean {
    return this.code.isEmpty;
  }

  get isNotDone(): boolean {
    return this.code.isNotEmpty;
  }

  thunk(block: Block): void {
    this.kill.append(this.data);
    this.kill.push(block);
  }

  bail(block: Block): void {
    this.thunk(block);
    this.kill.append(this.code);
  }
}

class ReadError {
  source: string;
  tokens: string[];
  index: number;
  message: string;

  constructor(
    source: string,
    tokens: string[],
    index: number,
    message: string,
  ) {
    this.source = source;
    this.tokens = tokens;
    this.index = index;
    this.message = message;
  }

  toString(): string {
    const position = this.tokens[this.index];
    return `While reading ${this.source}\nat token ${position}:\n${this.message}`;
  }
}

export type NormFx =
  | { tag: "bang"; state: State; block: Block; }
  | { tag: "annotation"; state: State; block: Block; }
  | { tag: "variable"; state: State; block: Block; }
  | { tag: "done"; block: Block; }
