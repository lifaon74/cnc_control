import { ByteStepEncoder } from '../../../../classes/lib/codec/byte-step/ts/ByteStepEncoder';
import { StepperMovement } from './StepperMovement';

export class StepperMovementEncoder extends ByteStepEncoder<StepperMovement> {
  protected _bytes: Uint8Array;
  protected _index: number;
  protected _moveIndex: number;

  constructor(input: StepperMovement) {
    super(input);
  }

  protected _next(): number {
    while(true) {
      switch(this._step) {
        case 0: // pinMask
          this._bytes = new Uint8Array(new Float64Array([this._input.duration]).buffer);
          this._index = 0;
          this._step = 1;
          return this._input.pinMask;
        case 1: // duration
          if(this._index >= this._bytes.length) {
            this._bytes = new Uint8Array(new Float64Array([this._input.initialSpeed]).buffer);
            this._index = 0;
            this._step = 2;
          } else {
            return this._bytes[this._index++];
          }
        case 2: // initialSpeed
          if(this._index >= this._bytes.length) {
            this._bytes = new Uint8Array(new Float64Array([this._input.acceleration]).buffer);
            this._index = 0;
            this._step = 3;
          } else {
            return this._bytes[this._index++];
          }
        case 3: // acceleration
          if(this._index >= this._bytes.length) {
            this._moveIndex = 0;
            this._step = 4;
          } else {
            return this._bytes[this._index++];
          }

        case 4: // movements
          if(this._moveIndex >= this._input.moves.length) {
            this._done = true;
            return 0;
          } else {
            this._bytes = new Uint8Array(new Int32Array([this._input.moves[this._moveIndex].target]).buffer);
            this._index = 0;
            this._step = 5;
          }
        case 5: // movement distance
          if(this._index >= this._bytes.length) {
            this._moveIndex++;
            this._step = 4;
            break;
          } else {
            return this._bytes[this._index++];
          }
        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}
