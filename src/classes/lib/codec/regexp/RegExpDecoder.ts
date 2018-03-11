import { ByteStepDecoder } from '../byte-step/ByteStepDecoder';
import { StringDecoder } from '../string/StringDecoder';


export class RegExpDecoder extends ByteStepDecoder<RegExp> {
  protected _stringDecoder: StringDecoder;
  protected _pattern: string;

  protected _next(value: number): void {
    /*
      return new RegExp(yield* this.deserializeString(), yield* this.deserializeString());
     */
    while(true) {
      switch(this._step) {
        case 0:
          this._stringDecoder = new StringDecoder();
        case 1:
          if(this._stringDecoder.done) {
            this._pattern = this._stringDecoder.output;
            // delete this._stringDecoder;
            this._stringDecoder = new StringDecoder();
            this._step = 3;
            break;
          }
          this._step = 2;
          return;
        case 2:
          this._stringDecoder.next(value);
          this._step = 1;
          break;
        case 3:
          if(this._stringDecoder.done) {
            this._output = new RegExp(this._pattern, this._stringDecoder.output);
            // delete this._stringDecoder;
            this._done = true;
            return;
          }
          this._step = 4;
          return;
        case 4:
          this._stringDecoder.next(value);
          this._step = 3;
          break;
        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}
