import { ByteStepDecoder } from '../byte-step/ts/ByteStepDecoder';
import { SizeDecoder } from '../size/SizeDecoder';
import { TextDecoder } from '../../../encoding/TextDecoder';

export class StringDecoder extends ByteStepDecoder<string> {
  protected _sizeDecoder: SizeDecoder;
  protected _bytes: Uint8Array;
  protected _index: number;

  protected _next(value: number): void {
    /*
      this._sizeDecoder = new SizeDecoder();
      yield* this._sizeDecoder;
      this._bytes = new Uint8Array(this._sizeDecoder.output);
      this._index = 0;
      while(this._index >= this._bytes.length) {
        this._bytes[this._index++] = yield;
      }
     */
    while(true) {
      switch(this._step) {
        case 0:
          this._sizeDecoder = new SizeDecoder();
        case 1:
          if(this._sizeDecoder.done) {
            this._bytes = new Uint8Array(this._sizeDecoder.output);
            // delete this._sizeDecoder;
            this._index = 0;
            this._step = 3;
            break;
          }
          this._step = 2;
          return;
        case 2:
          this._sizeDecoder.next(value);
          this._step = 1;
          break;
        case 3:
          this._done = (this._index >= this._bytes.length);
          if(this._done) this._output = new TextDecoder().decode(this._bytes);
          this._step = 4;
          return;
        case 4:
          this._bytes[this._index++] = value;
          this._step = 3;
          break;
        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}
