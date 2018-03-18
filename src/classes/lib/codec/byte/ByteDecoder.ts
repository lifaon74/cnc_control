import { Iterator } from '../Iterator';

export abstract class ByteDecoder<T>  extends Iterator {
  protected _output: T;

  constructor() {
    super();
    this._output = null;
  }

  get output(): T {
    return this._output;
  }

  abstract next(value: number): void;
}