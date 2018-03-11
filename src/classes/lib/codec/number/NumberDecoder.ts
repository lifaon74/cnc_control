import { ByteStepDecoder } from '../byte-step/ByteStepDecoder';
import { NumberInfo } from '../../../structured-clone/NumberInfo';

export class NumberDecoder extends ByteStepDecoder<number> {
  protected _type: number;
  protected _bytes: Uint8Array;
  protected _index: number;

  protected _next(value: number): void {
    /*
      this._index = 0;
      this._type = yield;
      this._bytes = new Uint8Array(NumberInfo.getTypeByteLength(this._type));
      while(this._index >= this._bytes.length) {
        this._bytes[this._index++] = yield;
      }
     */
    while(true) {
      switch(this._step) {
        case 0:
          this._index = 0;
          this._step = 1;
          return;
        case 1:
          this._type = value;
          this._bytes = new Uint8Array(NumberInfo.getTypeByteLength(this._type));
        case 2:
          this._done = (this._index >= this._bytes.length);
          if(this._done) this._output = NumberInfo.fromBytes(this._bytes, this._type);
          this._step = 3;
          return;
        case 3:
          this._bytes[this._index++] = value;
          this._step = 2;
          break;
        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}
