import { ByteStepDecoder } from '../../../../classes/lib/codec/byte-step/ByteStepDecoder';
import { Command, CommandCodes } from './Command';
import { StepperMovementDecoder } from '../../stepper-movement/ts/StepperMovementDecoder';

export class CommandDecoder extends ByteStepDecoder<Command> {
  protected _decoder: ByteStepDecoder<any>;

  constructor() {
    super();
  }

  protected _next(value: number): void {
    while(true) {
      switch(this._step) {
        case 0: // init
          this._output = new Command();
          this._step = 1;
          return;

        case 1: // id low
          this._output.id = value;
          this._step = 2;
          return;

        case 2: // id high
          this._output.id |= value << 8;
          this._step = 3;
          return;

        case 3: // code
          this._output.code = value;
          switch (value) {
            case CommandCodes.MOVE:
              this._decoder = new StepperMovementDecoder();
              break;
            default:
              throw new Error(`Invalid command type 0x${value.toString(16).padStart(2, '0')}`);
          }
          this._step = 4;

        case 4:
          if (this._decoder.done) {
            this._output.command = this._decoder.output;
            this._done = true;
          } else {
            this._step = 5;
          }
          return;

        case 5:
          this._decoder.next(value);
          this._step = 4;
          break;

        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}

