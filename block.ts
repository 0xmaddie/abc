export abstract class Block<T> {
  get constant(): string {
    throw `${this} is not a constant`;
  }

  get variable(): string {
    throw `${this} is not a variable`;
  }

  get annotation(): string {
    throw `${this} is not an annotation`;
  }

  get keyword(): string {
    throw `${this} is not a keyword`;
  }

  get natural(): bigint {
    throw `${this} is not a natural number`;
  }

  get embed(): T {
    throw `${this} is not an embedded value`;
  }

  get body(): Block<T> {
    throw `${this} is not a quotation`;
  }

  get fst(): Block<T> {
    throw `${this} is not a sequence`;
  }

  get snd(): Block<T> {
    throw `${this} is not a sequence`;
  }

  expand(): Block<T> {
    return this;
  }

  quote(): Block<T> {
    return new Quote(this);
  }

  seq(rhs: Block<T>): Block<T> {
    if (rhs instanceof Id) {
      return this;
    }
    return new Sequence(this, rhs);
  }

  *norm(): Generator<NormFx<T>> {
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
        switch (block.constant) {
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
                needle.constant === "R"
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

  toArray(): Block<T>[] {
    return [this];
  }

  abstract equals(rhs: Block<T>): boolean;

  static fromArray<T>(xs: Block<T>[]): Block<T> {
    let state: Block<T> = new Id();
    for (let i = xs.length - 1; i >= 0; --i) {
      state = xs[i].seq(state);
    }
    return state;
  }

  static fromString<T>(source: string): Block<T> {
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
    let stack: Block<T>[][] = [];
    let build: Block<T>[] = [];
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
        const program = new Constant<T>(token);
        build.push(program);
        index++;
      } else if (varP.test(token)) {
        const program = new Variable<T>(token);
        build.push(program);
        index++;
      } else if (annP.test(token)) {
        const name = token.slice(1);
        const program = new Annotation<T>(name);
        build.push(program);
        index++;
      } else if (natP.test(token)) {
        const value = BigInt(Number.parseInt(token));
        const program = new Natural<T>(value);
        build.push(program);
        index++;
      } else if (keyP.test(token)) {
        const name = token.slice(1);
        const program = new Keyword<T>(name);
        build.push(program);
        index++;
      } else if (token === "!") {
        const program = new Bang<T>();
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

  static norm<T>(source: string): Generator<NormFx<T>> {
    return Block.fromString<T>(source).norm();
  }
}

class Id<T> extends Block<T> {
  constructor() {
    super();
  }

  seq(rhs: Block<T>): Block<T> {
    return rhs;
  }

  equals(rhs: Block<T>): boolean {
    return rhs instanceof Id;
  }

  toString(): string {
    return "";
  }
}

class Constant<T> extends Block<T> {
  _name: string;

  constructor(name: string) {
    super();
    this._name = name;
  }

  get constant(): string {
    return this._name;
  }

  equals(rhs: Block<T>): boolean {
    if (rhs instanceof Constant) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return this._name;
  }
}

class Variable<T> extends Block<T> {
  _name: string;

  constructor(name: string) {
    super();
    this._name = name;
  }

  get variable(): string {
    return this._name;
  }

  equals(rhs: Block<T>): boolean {
    if (rhs instanceof Variable) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return this._name;
  }
}

class Natural<T> extends Block<T> {
  _value: bigint;

  constructor(value: bigint) {
    super();
    this._value = value;
  }

  get natural(): bigint {
    return this._value;
  }

  expand(): Block<T> {
    let block = new Variable<T>("zero").quote();
    for (let i = 0n; i < this._value; ++i) {
      block = block
        .seq(new Variable<T>("succ"))
        .quote();
    }
    return block;
  }

  equals(rhs: Block<T>): boolean {
    if (rhs instanceof Natural) {
      return this._value === rhs._value;
    }
    return false;
  }

  toString(): string {
    return `${this._value}`;
  }
}

function toTree<T>(
  buffer: Uint8Array,
): Block<T> {
  if (buffer.length === 2) {
    const fst = new Natural<T>(BigInt(buffer[0]));
    const snd = new Natural<T>(BigInt(buffer[1]));
    return fst.seq(snd).quote();
  }
  const midpoint = buffer.length/2;
  const lhs = buffer.subarray(0, midpoint);
  const rhs = buffer.subarray(midpoint);
  const fst = toTree<T>(lhs);
  const snd = toTree<T>(rhs);
  return fst.seq(snd).quote();
}

class Keyword<T> extends Block<T> {
  _name: string;

  constructor(name: string) {
    super();
    if (name.length > 32) {
      throw `keywords must be 32 bytes or less`;
    }
    this._name = name;
  }

  get keyword(): string {
    return this._name;
  }

  expand(): Block<T> {
    const encoder = new TextEncoder();
    const bytes = new Uint8Array(32);
    const raw = encoder.encode(this._name);
    for (let i = 0; i < raw.length; ++i) {
      bytes[i] = raw[i];
    }
    return toTree(bytes);
  }

  equals(rhs: Block<T>): boolean {
    if (rhs instanceof Keyword) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return `:${this._name}`;
  }
}

class Embed<T> extends Block<T> {
  _value: T;

  constructor(value: T) {
    super();
    this._value = value;
  }

  get embed(): T {
    return this._value;
  }

  equals(rhs: Block<T>): boolean {
    if (rhs instanceof Embed) {
      // TODO: equals constraint for embedded values
      return this._value === rhs._value;
    }
    return false;
  }

  toString(): string {
    return `#<${this._value}>`;
  }
}

class Quote<T> extends Block<T> {
  _body: Block<T>;

  constructor(body: Block<T>) {
    super();
    this._body = body;
  }

  get body(): Block<T> {
    return this._body;
  }

  equals(rhs: Block<T>): boolean {
    if (rhs instanceof Quote) {
      return this._body.equals(rhs._body);
    }
    return false;
  }

  toString(): string {
    return `[${this.body}]`;
  }
}

class Sequence<T> extends Block<T> {
  _fst: Block<T>;
  _snd: Block<T>;

  constructor(
    fst: Block<T>,
    snd: Block<T>,
  ) {
    super();
    this._fst = fst;
    this._snd = snd;
  }

  get fst(): Block<T> {
    return this._fst;
  }

  get snd(): Block<T> {
    return this._snd;
  }

  seq(rhs: Block<T>): Block<T> {
    if (rhs instanceof Id) {
      return this;
    }
    return this._fst.seq(this._snd.seq(rhs));
  }

  equals(rhs: Block<T>): boolean {
    if (rhs instanceof Sequence) {
      if (this._fst.equals(rhs._fst)) {
        return this._snd.equals(rhs._snd);
      }
    }
    return false;
  }

  toArray(): Block<T>[] {
    let buffer = [];
    let xs: Block<T> = this;
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

class Annotation<T> extends Block<T> {
  _name: string;

  constructor(name: string) {
    super();
    this._name = name;
  }

  get annotation(): string {
    return this._name;
  }

  equals(rhs: Block<T>): boolean {
    if (rhs instanceof Annotation) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return `@${this._name}`;
  }
}

class Bang<T> extends Block<T> {
  constructor() {
    super();
  }

  equals(rhs: Block<T>): boolean {
    return rhs instanceof Bang;
  }

  toString(): string {
    return "!";
  }
}

export class Stack<T> {
  buffer: Block<T>[];

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

  get top1(): Block<T> {
    return this.buffer[this.buffer.length - 1];
  }

  get top2(): Block<T> {
    return this.buffer[this.buffer.length - 2];
  }

  pop(): Block<T> {
    return this.buffer.pop()!;
  }

  push(block: Block<T>): void {
    this.buffer.push(block);
  }

  append(rhs: Stack<T>): void {
    this.buffer = this.buffer.concat(rhs.buffer);
    rhs.buffer = [];
  }
}

export class State<T> {
  code: Stack<T>;
  data: Stack<T>;
  kill: Stack<T>;

  constructor(initial: Block<T>) {
    this.code = new Stack();
    this.data = new Stack();
    this.kill = new Stack();
    this.code.push(initial);
  }

  get value(): Block<T> {
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

  thunk(block: Block<T>): void {
    this.kill.append(this.data);
    this.kill.push(block);
  }

  bail(block: Block<T>): void {
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

export type NormFx<T> =
  | { tag: "bang"; state: State<T>; block: Block<T>; }
  | { tag: "annotation"; state: State<T>; block: Block<T>; }
  | { tag: "variable"; state: State<T>; block: Block<T>; }
  | { tag: "done"; block: Block<T>; }
