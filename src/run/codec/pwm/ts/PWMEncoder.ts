import { ByteStepEncoder } from '../../../../classes/lib/codec/byte-step/ByteStepEncoder';
import { PWM } from './PWM';

// TODO
export class PWMEncoder extends ByteStepEncoder<PWM> {
  protected _bytes: Uint8Array;
  protected _index: number;

  constructor(input: PWM) {
    super(input);
  }

  protected _next(): number {
    switch (this._step) {
      case 0: // pin
        this._bytes = new Uint8Array(new Float64Array([this._input.value]).buffer);
        this._index = 0;
        this._step = 1;
        return this._input.pin & 0xff;

      case 1: // value
        if (this._index >= this._bytes.length) {
          this._bytes = new Uint8Array(new Float64Array([this._input.period]).buffer);
          this._index = 0;
          this._step = 2;
        } else {
          return this._bytes[this._index++];
        }

      case 2: // period
        if (this._index >= this._bytes.length) {
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


