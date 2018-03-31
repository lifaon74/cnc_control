import { codec, encode } from '../../../../classes/lib/codec/helpers';
import { CommandEncoder } from './CommandEncoder';
import { StepperMove, StepperMovement } from '../../stepper-movement/ts/StepperMovement';
import { Command, CommandCodes } from './Command';
import { CommandDecoder } from './CommandDecoder';

async function test() {
  const stepperMovement: StepperMovement = new StepperMovement();
  stepperMovement.duration = 10;
  stepperMovement.initialSpeed = 0.5;
  stepperMovement.acceleration = 0.1;
  stepperMovement.moves.push(new StepperMove(2, 17));
  stepperMovement.moves.push(new StepperMove(3, -28));

  const cmd: Command = new Command(123, CommandCodes.MOVE, stepperMovement);
  codec(new CommandEncoder(cmd), new CommandDecoder());
}

test();