import { ByteStepEncoder } from '../../../classes/lib/codec/byte-step/ByteStepEncoder';
import { StepperMovementEncoder } from '../stepper-movement/StepperMovementEncoder';
import { StepperMovement } from '../stepper-movement/StepperMovement';

export class Command {
  public id: number;
  public code: number;
  public command: any;

  constructor(id: number = null, code: number = 0, command: any = null) {
    this.id = code;
    this.code = code;
    this.command = command;
  }

}

export class CommandEncoder extends ByteStepEncoder<Command> {
  protected _bytes: Uint8Array;
  protected _index: number;
  protected _encoder: ByteStepEncoder<any>;

  constructor(input: Command) {
    super(input);
  }

  protected _next(): number {
    while(true) {
      switch(this._step) {
        case 0: // id
          this._bytes = new Uint8Array(new Uint16Array([this._input.id]).buffer);
          this._index = 0;
          this._step = 1;

        case 1: // id
          if(this._index >= this._bytes.length) {
            this._step = 2;
          } else {
            return this._bytes[this._index++];
          }

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
}
