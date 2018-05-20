import { codec, encode } from '../../../../classes/lib/codec/ts/helpers';
import { CommandEncoder } from './CommandEncoder';
import { StepperMove, StepperMovement } from '../../command/stepper-movement-command/ts/StepperMovement';
import { Command, CommandCodes } from './Command';
import { CommandDecoder } from './CommandDecoder';
import { Answer } from '../../answer/ts/Answer';
import { AnswerEncoder } from '../../answer/ts/AnswerEncoder';
import { InputsStateAnswer } from '../../answer/inputs-state-answer/ts/InputsStateAnswer';
import { AnswerDecoder } from '../../answer/ts/AnswerDecoder';
import { PWM } from '../pwm-command/ts/PWM';


async function testAnswers() {
  let ans: Answer;

  const inputsState: InputsStateAnswer = new InputsStateAnswer(0b01100011 /* 99 */, new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7]));

  ans = new Answer(123, CommandCodes.READ_INPUTS, inputsState);
  codec(new AnswerEncoder(ans), new AnswerDecoder());

}

async function test() {
  let cmd: Command;

  const stepperMovement: StepperMovement = new StepperMovement();
  stepperMovement.duration = 10;
  stepperMovement.initialSpeed = 0.5;
  stepperMovement.acceleration = 0.1;
  stepperMovement.moves.push(new StepperMove(2, 17));
  stepperMovement.moves.push(new StepperMove(3, -28));

  cmd = new Command(123, CommandCodes.MOVE, stepperMovement);
  codec(new CommandEncoder(cmd), new CommandDecoder());


  const pwm: PWM = new PWM(1, 0.5, 1.23);

  cmd = new Command(123, CommandCodes.PWM, pwm);
  codec(new CommandEncoder(cmd), new CommandDecoder());

  cmd = new Command(123, CommandCodes.READ_INPUTS, null);
  codec(new CommandEncoder(cmd), new CommandDecoder());
}

// test();
testAnswers();