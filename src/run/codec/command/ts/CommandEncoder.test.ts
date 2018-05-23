import { codec, encode } from '../../../../classes/lib/codec/ts/helpers';
import { CommandEncoder } from './CommandEncoder';
import { StepperMove, StepperMovementCommand } from '../../command/stepper-movement-command/ts/StepperMovementCommand';
import { Command} from './Command';
import { CommandDecoder } from './CommandDecoder';
import { Answer } from '../../answer/ts/Answer';
import { AnswerEncoder } from '../../answer/ts/AnswerEncoder';
import { InputsStateAnswer } from '../../answer/inputs-state-answer/ts/InputsStateAnswer';
import { AnswerDecoder } from '../../answer/ts/AnswerDecoder';
import { PWMCommand } from '../pwm-command/ts/PWMCommand';
import { CommandCodes } from '../../codes/ts/codes';


async function testAnswers() {
  let ans: Answer;

  const inputsState: InputsStateAnswer = new InputsStateAnswer(0b01100011 /* 99 */, new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7]));

  ans = new Answer(123, CommandCodes.READ_INPUTS, 0, inputsState);
  codec(new AnswerEncoder(ans), new AnswerDecoder());

}

async function test() {
  let cmd: Command;

  const stepperMovement: StepperMovementCommand = new StepperMovementCommand();
  stepperMovement.duration = 10;
  stepperMovement.initialSpeed = 0.5;
  stepperMovement.acceleration = 0.1;
  stepperMovement.moves.push(new StepperMove(2, 17));
  stepperMovement.moves.push(new StepperMove(3, -28));

  cmd = new Command(123, CommandCodes.MOVE, stepperMovement);
  codec(new CommandEncoder(cmd), new CommandDecoder());


  const pwm: PWMCommand = new PWMCommand(1, 0.5, 1.23);

  cmd = new Command(123, CommandCodes.PWM, pwm);
  codec(new CommandEncoder(cmd), new CommandDecoder());

  cmd = new Command(123, CommandCodes.READ_INPUTS, null);
  codec(new CommandEncoder(cmd), new CommandDecoder());
}

// test();
testAnswers();