import { ByteStepEncoder } from '../../../classes/lib/codec/byte-step/ByteStepEncoder';
import { StepperMovementEncoder } from '../stepper-movement/StepperMovementEncoder';
import { StepperMovement } from '../stepper-movement/StepperMovement';
import { Command } from './Command';

export class CommandEncoder extends ByteStepEncoder<Command> {
  protected _encoder: ByteStepEncoder<any>;

  constructor(input: Command) {
    super(input);
  }

  protected _next(): number {
    switch(this._step) {
      case 0: // id low
        this._step = 1;
        return this._input.id & 0xff;

      case 1: // id high
        this._step = 2;
        return (this._input.id >> 8) & 0xff;

      case 2: // code
        if (this._input.command instanceof StepperMovement) {
          this._encoder = new StepperMovementEncoder(this._input.command);
        } else {
          throw new Error(`Invalid command type`);
        }

        this._step = 3;
        return this._input.code;

      case 3: // command
        if(this._encoder.done) {
          this._done = true;
          return 0;
        } else {
          return this._encoder.next();
        }

      default:
        throw new Error('Unexpected step : ' + this._step);
    }
  }
}

