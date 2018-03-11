import { ByteEncoder } from '../byte/ByteEncoder';

export class SizeEncoder extends ByteEncoder<number> {
  next(): number {
    super.throwIfDone();
    let byte: number = (this._input & 0b01111111);
    this._input >>>= 7;
    byte |= ((this._input !== 0) as any) << 7;
    this._done = (this._input === 0);
    return byte;
  }
}
