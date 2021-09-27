import {
  Block,
  quote,
  sequence,
} from "./block.ts";

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
    let buf: Block<T>[] = [];
    for (let i = 0; i < this.kill.length; ++i) {
      buf.push(this.kill.buffer[i]);
    }
    for (let i = 0; i < this.data.length; ++i) {
      buf.push(this.data.buffer[i]);
    }
    for (let i = this.code.length-1; i >= 0; --i) {
      buf.push(this.code.buffer[i]);
    }
    return sequence(...buf);
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

export type Event<T> =
  | { tag: "request";
      method: "expand-variable";
      point: { tag: "variable"; name: string };
      state: State<T>; }
  | { tag: "request";
      method: "use-annotation";
      point: { tag: "annotation"; name: string };
      state: State<T>; }
  | { tag: "request";
      method: "run-plugin";
      point: { tag: "plugin"; name: string };
      state: State<T>; }
  | { tag: "condition";
      method: "check-arity";
      state: State<T>; }
  | { tag: "condition";
      method: "check-tag";
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
  while (state.code.isNotEmpty) {
    const point = state.code.pop();
    switch (point.tag) {
      case "id": {
        break;
      }
      case "natural": {
        state.data.push(point);
        break;
      }
      case "keyword": {
        state.data.push(point);
        break;
      }
      case "embed": {
        state.data.push(point);
        break;
      }
      case "quote": {
        state.data.push(point);
        break;
      }
      case "sequence": {
        state.code.push(point.snd);
        state.code.push(point.fst);
        break;
      }
      case "annotation": {
        yield {
          tag: "request",
          method: "use-annotation",
          point,
          state,
        };
        break;
      }
      case "variable": {
        yield {
          tag: "request",
          method: "expand-variable",
          point,
          state,
        };
        break;
      }
      case "plugin": {
        yield {
          tag: "request",
          method: "run-plugin",
          point,
          state,
        };
        break;
      }
      case "constant": {
        switch (point.name) {
          case "A": {
            if (state.data.length === 0) {
              state.code.push(point);
              yield {
                tag: "condition",
                method: "check-arity",
                state,
              };
              continue;
            }
            const source = state.data.top1;
            if (source.tag !== "quote") {
              state.code.push(point);
              yield {
                tag: "condition",
                method: "check-tag",
                state,
              };
              continue;
            }
            state.data.pop();
            state.code.push(source.body);
            break;
          }
          case "B": {
            if (state.data.length === 0) {
              state.code.push(point);
              yield {
                tag: "condition",
                method: "check-arity",
                state,
              };
              continue;
            }
            const source = state.data.pop();
            const target = quote(source);
            state.data.push(target);
            break;
          }
          case "C": {
            if (state.data.length < 2) {
              state.code.push(point);
              yield {
                tag: "condition",
                method: "check-arity",
                state,
              };
              continue;
            }
            const snd = state.data.top1;
            const fst = state.data.top2;
            if (
              fst.tag !== "quote" ||
              snd.tag !== "quote"
            ) {
              state.code.push(point);
              yield {
                tag: "condition",
                method: "check-tag",
                state,
              };
              continue;
            }
            state.data.pop();
            state.data.pop();
            const body = sequence(fst.body, snd.body);
            const target = quote(body);
            state.data.push(target);
            break;
          }
          case "D": {
            if (state.data.length === 0) {
              state.code.push(point);
              yield {
                tag: "condition",
                method: "check-arity",
                state,
              };
              continue;
            }
            state.data.push(state.data.top1);
            break;
          }
          case "E": {
            if (state.data.length === 0) {
              state.code.push(point);
              yield {
                tag: "condition",
                method: "check-arity",
                state,
              };
              continue;
            }
            state.data.pop();
            break;
          }
          case "F": {
            if (state.data.length < 2) {
              state.code.push(point);
              yield {
                tag: "condition",
                method: "check-arity",
                state,
              };
              continue;
            }
            const fst = state.data.pop();
            const snd = state.data.pop();
            state.data.push(fst);
            state.data.push(snd);
            break;
          }
        }
        break;
      }
    }
  }
  yield { tag: "done", state };
}
