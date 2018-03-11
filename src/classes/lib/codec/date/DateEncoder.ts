import { ByteEncoder } from '../byte/ByteEncoder';
import { NumberEncoder } from '../number/NumberEncoder';

export class DateEncoder extends ByteEncoder<Date> {
  protected _encoder: NumberEncoder;

  constructor(input: Date) {
    super(input);
    this._encoder = new NumberEncoder(input.valueOf());
  }

  get done(): boolean {
    return this._encoder.done;
  }

  next(): number {
    return this._encoder.next();
  }
}
