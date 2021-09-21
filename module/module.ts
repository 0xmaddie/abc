import {
  Block,
  show,
} from "../block/mod.ts";

import {
  Key,
  getKey,
} from "./key.ts";

/**
 * A key-value store of ABC blocks.
 */
export class Module<T> {
  _data: Map<string, Block<T>>;

  constructor() {
    this._data = new Map();
  }

  entries(): IterableIterator<[string, Block<T>]> {
    return this._data.entries();
  }

  has(key: Key): boolean {
    const name = getKey(key);
    return this._data.has(name);
  }

  get(key: Key): Block<T> {
    const name = getKey(key);
    if (!this._data.has(name)) {
      throw `${name} is undefined`;
    }
    return this._data.get(name)!;
  }
  
  set(key: Key, value: Block<T>): void {
    const name = getKey(key);
    this._data.set(name, value);
  }

  delete(key: Key): void {
    const name = getKey(key);
    this._data.delete(name);
  }

  toString(): string {
    return `#<module>`;
  }
}
