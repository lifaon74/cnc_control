import { ByteStepDecoder } from '../../../classes/lib/codec/byte-step/ByteStepDecoder';
import { StepperMove, StepperMovement } from './StepperMovement';

export class StepperMovementDecoder extends ByteStepDecoder<StepperMovement> {
  protected _bytes: Uint8Array;
  protected _index: number;
  protected _moveIndex: number;

  constructor() {
    super();
  }

  protected _next(value: number): void {
    while(true) {
      switch(this._step) {
        case 0: // init
          this._output = new StepperMovement();
          this._step = 1;
          return;

        case 1: // pinMask
          for(let i = 0; i < 8; i++) {
            if(value & (1 << i)) {
              this._output.moves.push(new StepperMove(i, 0));
            }
          }
          this._bytes = new Uint8Array(Float64Array.BYTES_PER_ELEMENT);
          this._index = 0;
          this._step = 2;

        case 2: // duration
          if(this._index >= this._bytes.length) {
            this._output.duration = new Float64Array(this._bytes.buffer)[0];
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

        case 4: // initialSpeed
          if(this._index >= this._bytes.length) {
            this._output.initialSpeed = new Float64Array(this._bytes.buffer)[0];
            this._index = 0;
            this._step = 6;
            break;
          } else {
            this._step = 5;
            return;
          }
        case 5:
          this._bytes[this._index++] = value;
          this._step = 4;
          break;

        case 6: // acceleration
          if(this._index >= this._bytes.length) {
            this._output.acceleration = new Float64Array(this._bytes.buffer)[0];
            this._moveIndex = 0;
            this._step = 8;
            break;
          } else {
            this._step = 7;
            return;
          }
        case 7:
          this._bytes[this._index++] = value;
          this._step = 6;
          break;

        case 8: // movements
          if(this._moveIndex >= this._output.moves.length) {
            this._done = true;
            return;
          } else {
            this._bytes = new Uint8Array(Int32Array.BYTES_PER_ELEMENT);
            this._index = 0;
            this._step = 9;
          }

        case 9: // movement distance
          if(this._index >= this._bytes.length) {
            this._output.moves[this._moveIndex].target = new Int32Array(this._bytes.buffer)[0];
            this._moveIndex++;
            this._step = 8;
            break;
          } else {
            this._step = 10;
            return;
          }
        case 10:
          this._bytes[this._index++] = value;
          this._step = 9;
          break;

        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}

