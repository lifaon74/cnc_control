import { ByteStepEncoder } from '../byte-step/ts/ByteStepEncoder';
import { StringEncoder } from '../string/StringEncoder';

export class RegExpEncoder extends ByteStepEncoder<RegExp> {

  protected _stringEncoder: StringEncoder;

  protected _next(): number {
    /*
       yield* this.serializeString(regexp.source);
       yield* this.serializeString(regexp.flags);
     */
    switch(this._step) {
      case 0:
        this._stringEncoder = new StringEncoder(this._input.source);
        this._step = 1;
      case 1:
        if(this._stringEncoder.done) {
          // delete this._stringEncoder;
          this._stringEncoder = new StringEncoder(this._input.flags);
          this._step = 2;
        } else {
          return this._stringEncoder.next();
        }
      case 2:
        if(this._stringEncoder.done) {
          // delete this._stringEncoder;
          this._done = true;
          return 0;
        } else {
          return this._stringEncoder.next();
        }
      default:
        throw new Error('Unexpected step : ' + this._step);
    }
  }
}
