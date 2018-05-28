import { ByteDecoder } from '../../byte/ts/ByteDecoder';

export abstract class ByteStepDecoder<T> extends ByteDecoder<T> {
  protected _step: number;

  constructor() {
    super();
    this._step = 0;
    this._done = true;
  }

  next(value: number): void {
    super.throwIfDone();
    this._next(value);
  }

  init(): this {
    this._output = null;
    this._step = 0;
    this._done = false;
    this._next(0);
    return this;
  }

  protected abstract _next(value: number): void;
}
