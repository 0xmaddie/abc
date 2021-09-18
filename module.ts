import {
  Block,
} from "./block.ts";

export class Module<T> {
  _data: Map<string, Block<T>>;

  constructor() {
    this._data = new Map();
  }

  has(key: string): boolean {
    return this._data.has(key);
  }

  get(key: string): Block<T> {
    if (!this._data.has(key)) {
      throw `${key} is undefined`;
    }
    return this._data.get(key)!;
  }

  set(key: string, value: Block<T>): void {
    this._data.set(key, value);
  }

  delete(key: string): void {
    this._data.delete(key);
  }

  toString(): string {
    let buf = [];
    for (const [key, value] of this._data.entries()) {
      buf.push(`+${key} ${value}`);
    }
    return buf.join("\n");
  }
}

export abstract class Patch<T> {
  abstract apply(ctx: Module<T>): void;

  seq(rhs: Patch<T>): Patch<T> {
    if (rhs instanceof Nil) {
      return this;
    }
    return new Sequence(this, rhs);
  }
  
  static fromString<T>(
    source: string,
  ): Patch<T> {
    const setP = /^\+[a-z_][a-z0-9_]* /;
    const deleteP = /^-[a-z_][a-z0-9_]*$/;
    const buf = [];
    for (const line of source.split("\n")) {
      if (setP.test(line)) {
        const space = line.indexOf(" ");
        const key = line.slice(1, space);
        const rest = line.slice(space+1);
        const block = Block.fromString(rest);
        buf.push(new Set(key, block));
      } else if (deleteP.test(line)) {
        const space = line.indexOf(" ");
        const key = line.slice(1, space);
        buf.push(new Delete(key));
      } else if (line.length === 0) {
        continue;
      } else {
        throw `couldn't read line ${line}`;
      }
    }
    let state = new Nil<T>();
    for (let i = buf.length-1; i >= 0; --i) {
      state = buf[i].seq(state);
    }
    return state;
  }
}

class Nil<T> extends Patch<T> {
  constructor() {
    super();
  }

  apply(ctx: Module<T>): void {
    //
  }

  seq(rhs: Patch<T>): Patch<T> {
    return rhs;
  }

  toString(): string {
    return "";
  }
}

class Sequence<T> extends Patch<T> {
  fst: Patch<T>;
  snd: Patch<T>;

  constructor(fst: Patch<T>, snd: Patch<T>) {
    super();
    this.fst = fst;
    this.snd = snd;
  }

  seq(rhs: Patch<T>): Patch<T> {
    if (rhs instanceof Nil) {
      return this;
    }
    return this.fst.seq(this.snd.seq(rhs));
  }

  apply(ctx: Module<T>): void {
    this.fst.apply(ctx);
    this.snd.apply(ctx);
  }

  toString(): string {
    return `${this.fst}\n${this.snd}`;
  }
}

class Set<T> extends Patch<T> {
  key: string;
  value: Block<T>;

  constructor(key: string, value: Block<T>) {
    super();
    this.key = key;
    this.value = value;
  }

  apply(ctx: Module<T>): void {
    ctx.set(this.key, this.value);
  }

  toString(): string {
    return `+${this.key} ${this.value}`;
  }
}

class Delete<T> extends Patch<T> {
  key: string;

  constructor(key: string) {
    super();
    this.key = key;
  }
  
  apply(ctx: Module<T>): void {
    ctx.delete(this.key);
  }

  toString(): string {
    return `-${this.key}`;
  }
}
