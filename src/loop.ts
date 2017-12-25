import { config } from './config';
import { StepperMove, StepperMovement } from './StepperMovement';
import { codec } from './classes/codec';


/**
 * [ CMD, PARAMS]
 *
 * Version: [GET_VERSION] => [number]
 *
 * Move : [ MOVE, StepperUsed, Duration (f64), InitialSpeed (f64), Acceleration(f64), values...(uint32[])]
 *   ex: [ COMMANDS.MOVE, 0b00000111, 1e-3, 4, 5, 1234, 5678, 9101]
 */

export class AGCODERunner {
  static STEPPERS_STEP_REG: number = 0;
  static STEPPERS_DIRECTION_REG: number = 1;
  static STEPPERS_ENABLED_REG: number = 2;


  public config: any;
  public time: number;

  public outBuffer: Uint8Array;
  public inBuffer: Uint8Array;

  public currentMove: StepperMovement | null;
  public moveStack: StepperMovement[];

  constructor(config: any) {
    this.config = config;
    this.time = this.getTime();

    this.outBuffer = new Uint8Array(6);
    this.inBuffer = new Uint8Array(6);

    this.outBuffer[AGCODERunner.STEPPERS_ENABLED_REG] = 0b11111111;

    this.currentMove = null;
    this.moveStack = [];

    this.mainLoop();
  }

  mainLoop(): void {
    const time: number = this.getTime();
    const loopTime: number = time - this.time;

    this.updateMovement(time);
    this.updateIO();

    this.time = time;
    setImmediate(() => this.mainLoop());
  }

  updateIO(): void {
    // console.log(
    //   this.outBuffer[AGCODERunner.STEPPERS_STEP_REG].toString(2),
    //   this.outBuffer[AGCODERunner.STEPPERS_DIRECTION_REG].toString(2)
    // );
  }


  updateMovement(time: number): void {
    if(this.currentMove !== null) {
      // const accelerationFactor: number = elapsedTime * elapsedTime * 0.5;
      const elapsedTime: number = time - this.currentMove.initialTime;
      const positionFactor: number = Math.min(1,
        this.currentMove.acceleration * elapsedTime * elapsedTime * 0.5 +
        this.currentMove.initialSpeed * elapsedTime
      );

      let stepsByte: number = 0;
      let directionByte: number = 0;

      let finished: boolean = true;
      let deltaValue: number;

      let move: StepperMove;
      for(let i = 0, l = this.currentMove.moves.length; i < l; i++) {
        move = this.currentMove.moves[i];

        if(!move.finished) {
          finished = false;
          if(elapsedTime > this.currentMove.duration) {
            // this.runOutOfTime++; // debug only
            deltaValue = 1;
          } else {
            deltaValue = (Math.round(positionFactor * move.target) - move.current);
            // if(deltaValue > 1) this.missedSteps++;
          }

          move.current += deltaValue;
          stepsByte |= ((deltaValue === 0) ? 0 : 1) << i;
          directionByte |= ((Math.sign(deltaValue) < 0) ? 0 : 1) << i;
        }
      }


      this.outBuffer[AGCODERunner.STEPPERS_STEP_REG] = stepsByte;
      this.outBuffer[AGCODERunner.STEPPERS_DIRECTION_REG] = directionByte;

      if(finished) {
        this.currentMove = null;
        console.log('done');
      }
    }

    if((this.currentMove === null) && (this.moveStack.length > 0)) {
      this.currentMove = this.moveStack.shift();
      this.currentMove.start();
    }
  }

  // return time in seconds
  private getTime(): number {
    const t = process.hrtime();
    return t[0] + t[1] * 1e-9;
  }
}


function linearMove(values: (number | null)[], duration: number): StepperMovement {
  const stepperMovement: StepperMovement = new StepperMovement();

  for (let i = 0; i < values.length; i++) {
    const value: number = values[i];
    stepperMovement.moves.push(new StepperMove(i, value));
  }

  stepperMovement.duration = duration;
  stepperMovement.initialSpeed = 0;
  stepperMovement.acceleration = 1 / (duration * duration);

  return stepperMovement;
}

function square(side: number, duration: number): StepperMovement[] {
  return [
    linearMove([side, 0], duration / 4),
    linearMove([0, side], duration / 4),
    linearMove([-side, 0], duration / 4),
    linearMove([0, -side], duration / 4),
  ];
}

function test() {
  const runner = new AGCODERunner(config);

  Array.prototype.push.apply(runner.moveStack, square(1000, 8));
  // runner.moveStack.push(linearMove([1000], 5));
}

test();


