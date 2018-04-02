import { ByteStepDecoder } from '../../../../classes/lib/codec/byte-step/ts/ByteStepDecoder';
import { PWM } from './PWM';

export type TPrecision = 'float32' | 'float64';

export class PWMDecoder extends ByteStepDecoder<PWM> {
  public precision: TPrecision;

  protected _bytes: Uint8Array;
  protected _index: number;

  constructor(precision: TPrecision = 'float64') {
    super();
    this.precision = precision;
  }

  protected _next(value: number): void {
    while (true) {
      switch (this._step) {
        case 0: // init
          this._output = new PWM();
          this._step = 1;
          return;

        case 1: // pin
          this._output.pin = value;
          this._bytes = new Uint8Array(Float64Array.BYTES_PER_ELEMENT);
          this._index = 0;
          this._step = 2;

        case 2: // value
          if (this._index >= this._bytes.length) {
            this._output.value = new Float64Array(this._bytes.buffer)[0];
            this._index = 0;
            this._step = 4;
            break;
          } else {
            this._step = 3;
            return;
          }
        case 3:
          this._bytes[this._index++] = value;
          this._step = 2;
          break;

        case 4: // period
          if (this._index >= this._bytes.length) {
            this._output.period = new Float64Array(this._bytes.buffer)[0];
            this._done = true;
            return;
          } else {
            this._step = 5;
            return;
          }
        case 5:
          this._bytes[this._index++] = value;
          this._step = 4;
          break;


        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}

