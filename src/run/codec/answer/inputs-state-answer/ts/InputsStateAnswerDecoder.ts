import { InputsStateAnswer } from './InputsStateAnswer';
import { ByteStepDecoder } from '../../../../../classes/lib/codec/byte-step/ts/ByteStepDecoder';

export class InputsStateAnswerDecoder extends ByteStepDecoder<InputsStateAnswer> {
  protected _bytes: Uint8Array;
  protected _index: number;

  constructor() {
    super();
  }

  protected _next(value: number): void {
    while (true) {
      switch (this._step) {
        case 0: // init
          this._output = new InputsStateAnswer();
          this._step = 1;
          return;

        case 1: // pins state low
          this._output.pinsState = value;
          this._step = 2;
          return;

        case 2: // pins state high
          this._output.pinsState |= value << 8;
          this._bytes = new Uint8Array(this._output.adcValues.buffer); // assume LE platform
          this._index = 0;
          this._step = 3;

        case 3: // period
          if (this._index >= this._bytes.length) {
            this._done = true;
            return;
          } else {
            this._step = 4;
            return;
          }
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

