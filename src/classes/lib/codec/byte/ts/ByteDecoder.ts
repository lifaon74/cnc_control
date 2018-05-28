import { Iterator } from '../../ts/Iterator';

export abstract class ByteDecoder<T>  extends Iterator {
  protected _output: T | null;

  constructor() {
    super();
    this._output = null;
  }

  get output(): T {
    return this._output;
  }

  abstract next(value: number): void;
}
