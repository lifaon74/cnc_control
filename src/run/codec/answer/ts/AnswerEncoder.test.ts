import { codec, encode } from '../../../../classes/lib/codec/ts/helpers';
import { AnswerEncoder } from './CommandEncoder';
import { StepperMove, StepperMovement } from '../../stepper-movement/ts/StepperMovement';
import { Answer, CommandCodes } from './Command';
import { AnswerDecoder } from './CommandDecoder';
import { PWM } from '../../pwm/ts/PWM';

async function test() {
  let cmd: Answer;

  const stepperMovement: StepperMovement = new StepperMovement();
  stepperMovement.duration = 10;
  stepperMovement.initialSpeed = 0.5;
  stepperMovement.acceleration = 0.1;
  stepperMovement.moves.push(new StepperMove(2, 17));
  stepperMovement.moves.push(new StepperMove(3, -28));

  cmd = new Answer(123, CommandCodes.MOVE, stepperMovement);
  codec(new AnswerEncoder(cmd), new AnswerDecoder());


  const pwm: PWM = new PWM(1, 0.5, 1.23);

  cmd = new Answer(123, CommandCodes.PWM, pwm);
  codec(new AnswerEncoder(cmd), new AnswerDecoder());
}

test();