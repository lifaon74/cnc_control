import { ByteStepEncoder } from '../byte-step/ByteStepEncoder';
import { SizeEncoder } from '../size/SizeEncoder';

export class ArrayBufferEncoder extends ByteStepEncoder<ArrayBuffer> {

  protected _sizeEncoder: SizeEncoder;
  protected _bytes: Uint8Array;
  protected _index: number;

  protected _next(): number {
    /*
       yield* this.serializeSize(buffer.byteLength);
       yield* new Uint8Array(buffer);
     */
    switch(this._step) {
      case 0:
        this._bytes = new Uint8Array(this._input);
        this._sizeEncoder = new SizeEncoder(this._bytes.length);
        this._step = 1;
      case 1:
        if(this._sizeEncoder.done) {
          // delete this._sizeEncoder;
          this._index = 0;
          this._step = 2;
        } else {
          return this._sizeEncoder.next();
        }
      case 2:
        this._done = (this._index >= this._bytes.length);
        if(this._done) return 0;
        return this._bytes[this._index++];
      default:
        throw new Error('Unexpected step : ' + this._step);
    }
  }
}