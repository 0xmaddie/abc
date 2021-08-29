import {
  Term,
  Id,
  Constant,
  Variable,
  Quote,
  Sequence,
} from "./term.ts";

export class Stack {
  buffer: Term[];

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

  get top1(): Term {
    return this.buffer[this.buffer.length-1];
  }

  get top2(): Term {
    return this.buffer[this.buffer.length-2];
  }

  pop(): Term {
    return this.buffer.pop()!;
  }

  push(point: Term): void {
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

  constructor(initial: Term) {
    this.code = new Stack();
    this.data = new Stack();
    this.kill = new Stack();
    this.code.push(initial);
  }

  get value(): Term {
    const code = this.code.buffer.slice();
    code.reverse();
    const buffer = this.kill.buffer.concat(
      this.data.buffer,
      code,
    );
    return Term.fromArray(buffer);
  }

  get isDone(): boolean {
    return this.code.isEmpty;
  }

  get isNotDone(): boolean {
    return this.code.isNotEmpty;
  }
  
  thunk(point: Term): void {
    this.kill.append(this.data);
    this.kill.push(point);
  }

  bail(point: Term): void {
    this.thunk(point);
    this.kill.append(this.code);
  }
}

export function norm(
  source: Term,
): Term {
  let state = new State(source);
  while (state.isNotDone) {
    const point = state.code.pop();
    if (point instanceof Id) {
      //
    } else if (point instanceof Sequence) {
      state.code.push(point.snd);
      state.code.push(point.fst);
    } else if (point instanceof Quote) {
      state.data.push(point);
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
            const action = Term.fromArray(buffer).quote();
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

