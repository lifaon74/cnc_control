import { ByteEncoder } from '../byte/ByteEncoder';
import { NumberEncoder } from '../number/NumberEncoder';

export class NumberObjectEncoder extends ByteEncoder<Number> {
  protected _encoder: NumberEncoder;

  constructor(input: Number, type?: number) {
    super(input);
    this._encoder = new NumberEncoder(input.valueOf(), type);
  }

  get done(): boolean {
    return this._encoder.done;
  }

  next(): number {
    return this._encoder.next();
  }
}
