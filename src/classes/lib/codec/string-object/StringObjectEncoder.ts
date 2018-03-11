import { ByteEncoder } from '../byte/ByteEncoder';
import { StringEncoder } from '../string/StringEncoder';

export class StringObjectEncoder extends ByteEncoder<String> {
  protected _stringEncoder: StringEncoder;

  constructor(input: String) {
    super(input);
    this._stringEncoder = new StringEncoder(input.valueOf());
  }

  get done(): boolean {
    return this._stringEncoder.done;
  }

  next(): number {
    return this._stringEncoder.next();
  }
}
