import { NumberInfo } from '../../../structured-clone/NumberInfo';
import { ByteStepEncoder } from '../byte-step/ByteStepEncoder';

export class NumberEncoder extends ByteStepEncoder<number> {

  protected _type: number;
  protected _bytes: Uint8Array;
  protected _index: number;

  constructor(input: number, type?: number) {
    super(input, false);
    this._type = (type === void 0) ? NumberInfo.getType(this._input) : type;
    this._init();
  }

  protected _next(): number {
    /*
      this._bytes = NumberInfo.toBytes(this._input, this._type);
      this._index = 0;
      yield this._type;
      while(this._index >= this._bytes.length) {
        yield this._bytes[this._index++];
      }
     */
    switch(this._step) {
      case 0:
        this._bytes = NumberInfo.toBytes(this._input, this._type);
        this._index = 0;
        this._step = 1;
        return this._type;
      case 1:
        this._done = (this._index >= this._bytes.length);
        if(this._done) return 0;
        return this._bytes[this._index++];
      default:
        throw new Error('Unexpected step : ' + this._step);
    }
  }
}
