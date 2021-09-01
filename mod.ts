export abstract class Block {
  get name(): string {
    throw `${this} is not a constant or variable`;
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

  quote(): Block {
    return new Quote(this);
  }

  seq(rhs: Block): Block {
    if (rhs instanceof Id) {
      return this;
    }
    return new Sequence(this, rhs);
  }

  norm(fx?: Handler): Block {
    let state = new State(this);
    while (state.isNotDone) {
      const point = state.code.pop();
      if (point instanceof Id) {
        //
      } else if (point instanceof Sequence) {
        state.code.push(point.snd);
        state.code.push(point.fst);
      } else if (point instanceof Quote) {
        state.data.push(point);
      } else if (point instanceof Annotation) {
        if (fx) {
          fx.onAnnotation(point.name, state);
        }
      } else if (point instanceof Bang) {
        if (fx) {
          fx.onBang(state);
        } else {
          state.thunk(point);
        }
      } else if (point instanceof Variable) {
        state.thunk(point);
      } else if (point instanceof Constant) {
        switch (point.name) {
          case "A": {
            const block = state.data.top1;
            state.code.push(block.body);
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
            state.thunk(point);
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
              state.bail(point);
            }
            break;
          }
        }
      } else {
        state.thunk(point);
      }
    }
    return state.value;
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
        const program = Block.fromArray(build).quote();
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

  push(point: Block): void {
    this.buffer.push(point);
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

  thunk(point: Block): void {
    this.kill.append(this.data);
    this.kill.push(point);
  }

  bail(point: Block): void {
    this.thunk(point);
    this.kill.append(this.code);
  }
}

export interface Handler {
  onBang(state: State): void;
  onAnnotation(name: string, state: State): void;
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
