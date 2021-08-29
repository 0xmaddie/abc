export abstract class Term {
  get body(): Term {
    throw `${this} is not a quote`;
  }

  get fst(): Term {
    throw `${this} is not a sequence`;
  }

  get snd(): Term {
    throw `${this} is not a sequence`;
  }

  quote(): Term {
    return new Quote(this);
  }
  
  seq(rhs: Term): Term {
    if (rhs instanceof Id) {
      return this;
    }
    return new Sequence(this, rhs);
  }

  abstract equals(rhs: Term): boolean;

  static get id(): Term {
    return new Id();
  }

  static constant(name: string): Term {
    return new Constant(name);
  }

  static variable(name: string): Term {
    return new Variable(name);
  }

  static fromArray(xs: Term[]): Term {
    let state: Term = new Id();
    for (let i = xs.length-1; i >= 0; --i) {
      state = xs[i].seq(state);
    }
    return state;
  }
}

export class Id extends Term {
  constructor() {
    super();
  }

  equals(rhs: Term): boolean {
    return rhs instanceof Id;
  }

  toString(): string {
    return "";
  }
}

export class Constant extends Term {
  _name: string;

  constructor(name: string) {
    super();
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  equals(rhs: Term): boolean {
    if (rhs instanceof Constant) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return this.name;
  } 
}

export class Variable extends Term {
  _name: string;

  constructor(name: string) {
    super();
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  equals(rhs: Term): boolean {
    if (rhs instanceof Variable) {
      return this._name === rhs._name;
    }
    return false;
  }

  toString(): string {
    return this.name;
  }
}

export class Quote extends Term {
  _body: Term;

  constructor(body: Term) {
    super();
    this._body = body;
  }

  get body(): Term {
    return this._body;
  }

  equals(rhs: Term): boolean {
    if (rhs instanceof Quote) {
      return this._body.equals(rhs._body);
    }
    return false;
  }

  toString(): string {
    return `[${this.body}]`;
  }
}

export class Sequence extends Term {
  _fst: Term;
  _snd: Term;

  constructor(
    fst: Term,
    snd: Term,
  ) {
    super();
    this._fst = fst;
    this._snd = snd;
  }

  get fst(): Term {
    return this._fst;
  }

  get snd(): Term {
    return this._snd;
  }

  seq(rhs: Term): Term {
    if (rhs instanceof Id) {
      return this;
    }
    return this._fst.seq(this._snd.seq(rhs));
  }

  equals(rhs: Term): boolean {
    if (rhs instanceof Sequence) {
      if (this._fst.equals(rhs._fst)) {
        return this._snd.equals(rhs._snd);
      }
    }
    return false;
  }

  toString(): string {
    return `${this.fst} ${this.snd}`;
  }
}
