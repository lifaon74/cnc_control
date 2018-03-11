import { ByteDecoder } from '../byte/ByteDecoder';
import { NumberDecoder } from '../number/NumberDecoder';

export class NumberObjectDecoder extends ByteDecoder<Number> {
  protected _decoder: NumberDecoder;

  constructor() {
    super();
    this._decoder = new NumberDecoder();
  }

  get done(): boolean {
    return this._decoder.done;
  }

  next(value: number): void {
    this._decoder.next(value);
    if(this._decoder.done) {
      this._output = new Number(this._decoder.output);
    }
  }
}
