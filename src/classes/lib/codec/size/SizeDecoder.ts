import { ByteDecoder } from '../byte/ByteDecoder';

export class SizeDecoder extends ByteDecoder<number> {
  protected _offset: number;

  constructor() {
    super();
    this._output = 0;
    this._offset = 0;
  }

  next(value: number): void {
    super.throwIfDone();
    this._output |= (value & 0b01111111) << this._offset;
    this._offset += 7;
    this._done = (value & 0b10000000) === 0;
  }
}