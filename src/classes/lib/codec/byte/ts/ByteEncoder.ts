import { Iterator } from '../../ts/Iterator';

export abstract class ByteEncoder<T> extends Iterator {
  protected _input: T;

  constructor(input: T) {
    super();
    this._input = input;
  }

  get input(): T {
    return this._input;
  }

  abstract next(): number;
}
