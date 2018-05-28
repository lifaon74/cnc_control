import { ByteEncoder } from '../../byte/ts/ByteEncoder';

export abstract class ByteStepEncoder<T> extends ByteEncoder<T> {
  protected _step: number;
  protected _yieldValue: number;

  constructor() {
    super();
    this._step = 0;
    this._done = true;
  }

  next(): number {
    super.throwIfDone();
    const value: number = this._yieldValue;
    this._yieldValue = this._next();
    return value;
  }

  init(input: T): this {
    this._input = input;
    this._step = 0;
    this._done = (this._input === null);
    if (!this._done) {
      this._yieldValue = this._next();
    }
    return this;
  }

  protected abstract _next(): number;
}
