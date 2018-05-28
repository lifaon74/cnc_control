import { Iterator } from '../../ts/Iterator';

export abstract class ByteEncoder<T> extends Iterator {
  protected _input: T | null;

  constructor() {
    super();
    this._input = null;
  }

  get input(): T {
    return this._input;
  }

  abstract next(): number;
}
