import { ByteDecoder } from '../byte/ByteDecoder';

export abstract class ByteStepDecoder<T> extends ByteDecoder<T> {
  protected _step: number;

  constructor(initCall: boolean = true) {
    super();
    this._step = 0;
    if (initCall) {
      this._init();
    }
  }

  next(value: number): void {
    super.throwIfDone();
    this._next(value);
  }

  protected _init(): void {
    this._next(0);
  }

  protected abstract _next(value: number): void;
}
