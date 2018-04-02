import { ByteDecoder } from '../byte/ts/ByteDecoder';
import { StringDecoder } from '../string/StringDecoder';

export class StringObjectDecoder extends ByteDecoder<String> {
  protected _stringDecoder: StringDecoder;

  constructor() {
    super();
    this._stringDecoder = new StringDecoder();
  }

  get done(): boolean {
    return this._stringDecoder.done;
  }

  next(value: number): void {
    this._stringDecoder.next(value);
    if(this._stringDecoder.done) {
      this._output = new String(this._stringDecoder.output);
    }
  }
}
