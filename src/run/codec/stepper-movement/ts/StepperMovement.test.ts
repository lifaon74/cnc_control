import { StepperMove, StepperMovement } from './StepperMovement';
import { codec } from '../../../../classes/lib/codec/helpers';
import { StepperMovementEncoder } from './StepperMovementEncoder';
import { StepperMovementDecoder } from './StepperMovementDecoder';


function test() {
  const stepperMovement: StepperMovement = new StepperMovement();
  stepperMovement.duration = 10;
  stepperMovement.initialSpeed = 0.5;
  stepperMovement.acceleration = 0.1;
  stepperMovement.moves.push(new StepperMove(2, 17));
  stepperMovement.moves.push(new StepperMove(3, -28));
  codec(new StepperMovementEncoder(stepperMovement), new StepperMovementDecoder());

  let a: number = 0;
  // console.time('StepperMovementEncoder');
  // for(let i = 0; i < 1e5; i++) {
  //   a += encode(new StepperMovementEncoder(stepperMovement)).length;
  // }
  // console.timeEnd('StepperMovementEncoder');
  // console.log('a', a);

  console.time('StepperMovementDecoder');
  for(let i = 0; i < 1e5; i++) {
    const encoder = new StepperMovementEncoder(stepperMovement);
    const decoder = new StepperMovementDecoder();
    while(!encoder.done) {
      decoder.next(encoder.next());
    }
    a += decoder.output.duration;
    // a += decode(new StepperMovementDecoder(), encode(new StepperMovementEncoder(stepperMovement))).duration;
  }
  console.timeEnd('StepperMovementDecoder');
  console.log('a', a);
}

// test();