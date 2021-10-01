import * as block from "../block/mod.ts";
import * as key from "../key/mod.ts";

/**
 * A key-value store of ABC blocks.
 */
export class Module<T> {
  _data: Map<string, block.Block<T>>;

  constructor() {
    this._data = new Map();
  }

  entries(
  ): IterableIterator<[string, block.Block<T>]> {
    return this._data.entries();
  }

  has(point: key.Key): boolean {
    const name = key.name(point);
    return this._data.has(name);
  }

  get(point: key.Key): block.Block<T> {
    const name = key.name(point);
    if (!this._data.has(name)) {
      throw `${name} is undefined`;
    }
    return this._data.get(name)!;
  }

  set(
    point: key.Key,
    value: block.Block<T>,
  ): void {
    const name = key.name(point);
    this._data.set(name, value);
  }

  delete(point: key.Key): void {
    const name = key.name(point);
    this._data.delete(name);
  }

  toString(): string {
    return `#<module>`;
  }
}
