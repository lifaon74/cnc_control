import { ByteEncoder } from '../../byte/ts/ByteEncoder';

export abstract class ByteStepEncoder<T> extends ByteEncoder<T> {
  protected _step: number;
  protected _yieldValue: number;

  constructor(input: T, initCall: boolean = true) {
    super(input);
    this._step = 0;
    if (initCall) {
      this._init();
    }
  }

  next(): number {
    super.throwIfDone();
    const value: number = this._yieldValue;
    this._yieldValue = this._next();
    return value;
  }

  protected _init(): void {
    this._yieldValue = this._next();
  }

  protected abstract _next(): number;
}
