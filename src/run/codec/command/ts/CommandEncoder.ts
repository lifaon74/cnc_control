import { ByteStepEncoder } from '../../../../classes/lib/codec/byte-step/ts/ByteStepEncoder';
import { StepperMovementEncoder } from '../../command/stepper-movement-command/ts/StepperMovementEncoder';
import { Command, CommandCodes } from './Command';
import { PWMEncoder } from '../pwm-command/ts/PWMEncoder';

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

        switch (this._input.code) {
          case CommandCodes.READ_INPUTS:
            this._encoder = null;
            break;
          case CommandCodes.PWM:
            this._encoder = new PWMEncoder(this._input.command);
            break;
          case CommandCodes.MOVE:
            this._encoder = new StepperMovementEncoder(this._input.command);
            break;
          default:
            throw new Error(`Invalid command type 0x${this._input.code.toString(16).padStart(2, '0')}`);
        }

        this._step = 3;
        return this._input.code;

      case 3: // command
        if((this._encoder === null) || this._encoder.done) {
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


