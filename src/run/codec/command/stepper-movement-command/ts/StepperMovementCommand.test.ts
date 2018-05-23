import { StepperMove, StepperMovementCommand } from './StepperMovementCommand';
import { codec } from '../../../../../classes/lib/codec/ts/helpers';
import { StepperMovementCommandEncoder } from './StepperMovementCommandEncoder';
import { StepperMovementCommandDecoder } from './StepperMovementCommandDecoder';


function test() {
  const stepperMovement: StepperMovementCommand = new StepperMovementCommand();
  stepperMovement.duration = 10;
  stepperMovement.initialSpeed = 0.5;
  stepperMovement.acceleration = 0.1;
  stepperMovement.moves.push(new StepperMove(2, 17));
  stepperMovement.moves.push(new StepperMove(3, -28));
  codec(new StepperMovementCommandEncoder(stepperMovement), new StepperMovementCommandDecoder());

  let a: number = 0;
  // console.time('StepperMovementCommandEncoder');
  // for(let i = 0; i < 1e5; i++) {
  //   a += encode(new StepperMovementCommandEncoder(stepperMovement)).length;
  // }
  // console.timeEnd('StepperMovementCommandEncoder');
  // console.log('a', a);

  console.time('StepperMovementCommandDecoder');
  for(let i = 0; i < 1e5; i++) {
    const encoder = new StepperMovementCommandEncoder(stepperMovement);
    const decoder = new StepperMovementCommandDecoder();
    while(!encoder.done) {
      decoder.next(encoder.next());
    }
    a += decoder.output.duration;
    // a += decode(new StepperMovementCommandDecoder(), encode(new StepperMovementCommandEncoder(stepperMovement))).duration;
  }
  console.timeEnd('StepperMovementCommandDecoder');
  console.log('a', a);
}

// test();