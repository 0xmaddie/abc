import {
  Block,
  quote,
  sequence,
} from "./block.ts";

export class State<T> {
  code: Block<T>[];
  data: Block<T>[];
  kill: Block<T>[];
  point?: Block<T>;

  constructor(initial: Block<T>) {
    this.code = [initial];
    this.data = [];
    this.kill = [];
  }

  get value(): Block<T> {
    let buf: Block<T>[] = [];
    for (let i = 0; i < this.kill.length; ++i) {
      buf.push(this.kill[i]);
    }
    for (let i = 0; i < this.data.length; ++i) {
      buf.push(this.data[i]);
    }
    if (this.point) {
      buf.push(this.point);
    }
    for (let i = this.code.length-1; i >= 0; --i) {
      buf.push(this.code[i]);
    }
    return sequence(...buf);
  }

  get isDone(): boolean {
    return this.code.length === 0;
  }

  get isNotDone(): boolean {
    return this.code.length !== 0;
  }

  get isEmpty(): boolean {
    return this.data.length === 0;
  }

  get isNotEmpty(): boolean {
    return this.data.length !== 0;
  }

  get arity(): number {
    return this.data.length;
  }

  get top1(): Block<T> {
    if (this.data.length === 0) {
      throw `State.top1: stack underflow`;
    }
    return this.data[this.data.length-1];
  }

  get top2(): Block<T> {
    if (this.data.length < 2) {
      throw `State.top2: stack underflow`;
    }
    return this.data[this.data.length-2];
  }

  next(): Block<T> {
    this.point = this.code.pop()!;
    if (!this.point) {
      throw `State.next: missing point`;
    }
    return this.point;
  }

  back(): void {
    if (!this.point) {
      throw `State.back: missing point`;
    }
    this.code.push(this.point);
    this.point = undefined;
  }

  schedule(block: Block<T>): void {
    this.code.push(block);
  }

  push(block: Block<T>): void {
    this.data.push(block);
  }

  pop(): Block<T> {
    return this.data.pop()!;
  }

  peek(index: number): Block<T> {
    if (this.data.length <= index) {
      throw `State.peek: stack underflow`;
    }
    return this.data[this.data.length-1-index];
  }

  thunk(): void {
    this.kill = this.kill.concat(this.data);
    if (this.point) {
      this.kill.push(this.point);
      this.point = undefined;
    }
    this.data = [];
  }

  bail(): void {
    this.thunk();
    this.kill = this.kill.concat(this.code);
    this.code = [];
  }

  request(
    method: "annotation" | "extension" | "variable",
  ): Event<T> {
    const point = this.point;
    if (
      point === undefined ||
      (point.tag !== "annotation" &&
       point.tag !== "extension" &&
       point.tag !== "variable")
    ) {
      throw `State.request: inconsistent state`;
    }
    return {
      tag: "request",
      method,
      state: this,
      name: point.name,
    };
  }

  condition(
    method: "arity" | "tag",
  ): Event<T> {
    if (!this.point) {
      throw `State.condition: missing point`;
    }
    this.code.push(this.point);
    this.point = undefined;
    return { tag: "condition", method, state: this };
  }

  done(): Event<T> {
    this.point = undefined;
    return { tag: "done", state: this };
  }
}

export type Event<T> =
  | { tag: "request";
      method: "variable";
      state: State<T>;
      name: string; }
  | { tag: "request";
      method: "annotation";
      state: State<T>;
      name: string }
  | { tag: "request";
      method: "extension";
      state: State<T>;
      name: string }
  | { tag: "condition";
      method: "arity";
      state: State<T>; }
  | { tag: "condition";
      method: "tag";
      state: State<T>; }
  | { tag: "done";
      state: State<T>; }

/**
 * Rewrite a block until it reaches normal form.
 */
export function* norm<T>(
  initial: Block<T>,
): Generator<Event<T>> {
  let state = new State<T>(initial);
  while (state.isNotDone) {
    const point = state.next();
    switch (point.tag) {
      case "id": {
        break;
      }
      case "natural": {
        state.push(point);
        break;
      }
      case "keyword": {
        state.push(point);
        break;
      }
      case "embed": {
        state.push(point);
        break;
      }
      case "quote": {
        state.push(point);
        break;
      }
      case "sequence": {
        state.schedule(point.snd);
        state.schedule(point.fst);
        break;
      }
      case "annotation": {
        yield state.request("annotation");
        break;
      }
      case "variable": {
        yield state.request("variable");
        break;
      }
      case "extension": {
        yield state.request("extension");
        break;
      }
      case "constant": {
        switch (point.name) {
          case "A": {
            if (state.isEmpty) {
              yield state.condition("arity");
              continue;
            }
            const source = state.top1;
            if (source.tag !== "quote") {
              yield state.condition("arity");
              continue;
            }
            state.pop();
            state.schedule(source.body);
            break;
          }
          case "B": {
            if (state.isEmpty) {
              yield state.condition("arity");
              continue;
            }
            const source = state.pop();
            const target = quote(source);
            state.push(target);
            break;
          }
          case "C": {
            if (state.arity < 2) {
              yield state.condition("arity");
              continue;
            }
            const snd = state.top1;
            const fst = state.top2;
            if (
              fst.tag !== "quote" ||
              snd.tag !== "quote"
            ) {
              yield state.condition("tag");
              continue;
            }
            state.pop();
            state.pop();
            const body = sequence(fst.body, snd.body);
            const target = quote(body);
            state.push(target);
            break;
          }
          case "D": {
            if (state.isEmpty) {
              yield state.condition("arity");
              continue;
            }
            state.push(state.top1);
            break;
          }
          case "E": {
            if (state.isEmpty) {
              yield state.condition("arity");
              continue;
            }
            state.pop();
            break;
          }
          case "F": {
            if (state.arity < 2) {
              yield state.condition("arity");
              continue;
            }
            const fst = state.pop();
            const snd = state.pop();
            state.push(fst);
            state.push(snd);
            break;
          }
        }
        break;
      }
    }
  }
  yield state.done();
}
