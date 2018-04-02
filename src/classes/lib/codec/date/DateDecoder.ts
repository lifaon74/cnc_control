import { ByteDecoder } from '../byte/ts/ByteDecoder';
import { NumberDecoder } from '../number/NumberDecoder';

export class DateDecoder extends ByteDecoder<Date> {
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
      this._output = new Date(this._decoder.output);
    }
  }
}
