import { ByteStepEncoder } from '../../../../../classes/lib/codec/byte-step/ts/ByteStepEncoder';
import { InputsStateAnswer } from './InputsStateAnswer';


export class InputsStateAnswerEncoder extends ByteStepEncoder<InputsStateAnswer> {
  protected _bytes: Uint8Array;
  protected _index: number;

  constructor(input: InputsStateAnswer) {
    super(input);
  }

  protected _next(): number {
    switch (this._step) {
      case 0: // pins state low
        this._step = 1;
        return this._input.pinsState & 0xff;

      case 1: // pins state high
        this._bytes = new Uint8Array(this._input.adcValues.buffer);
        this._index = 0;
        this._step = 2;
        return (this._input.pinsState >> 8) & 0xff;

      case 2: // adc values
        if (this._index >= this._bytes.length) {
          delete this._bytes;
          this._done = true;
          return 0;
        } else {
          return this._bytes[this._index++];
        }

      default:
        throw new Error('Unexpected step : ' + this._step);
    }
  }
}


