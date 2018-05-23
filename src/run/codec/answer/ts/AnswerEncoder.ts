import { ByteStepEncoder } from '../../../../classes/lib/codec/byte-step/ts/ByteStepEncoder';
import { Answer } from './Answer';
import { CommandCodes } from '../../codes/ts/codes';
import { InputsStateAnswerEncoder } from '../inputs-state-answer/ts/InputsStateAnswerEncoder';
import { InputsStateAnswer } from '../inputs-state-answer/ts/InputsStateAnswer';

export class AnswerEncoder extends ByteStepEncoder<Answer> {
  protected _encoder: ByteStepEncoder<any>;

  constructor(input: Answer) {
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
        this._step = 3;
        return this._input.code;

      case 3: // state

        switch (this._input.code) {
          case CommandCodes.READ_INPUTS:
            this._encoder = new InputsStateAnswerEncoder(this._input.answer as InputsStateAnswer);
            break;
          case CommandCodes.PWM:
            this._encoder = null;
            break;
          case CommandCodes.MOVE:
            this._encoder = null;
            break;
          default:
            throw new Error(`Invalid command type 0x${this._input.code.toString(16).padStart(2, '0')}`);
        }

        this._step = 4;
        return this._input.state;

      case 4: // answer
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


