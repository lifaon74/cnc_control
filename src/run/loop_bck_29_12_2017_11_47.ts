import { config } from './config';
import { StepperMove, StepperMovement, StepperMovementDecoder } from './StepperMovement';
import { codec } from '../classes/lib/codec';
import { $delay, GetTime } from '../classes/misc';
import { GPIOController, SPIController } from './gpio';
import { SharedBufferStream } from './SharedBufferStream';





export class PWM {
  public value: number;
  public period: number;

  constructor(value: number, period: number) {
    this.value = value;
    this.period = period;
  }

  getState(): number {
    return ((GetTime() % this.period) < (this.value * this.period)) ? 1 : 0;
  }
}

/**
 * [ CMD, PARAMS]
 *
 * Version: [GET_VERSION] => [number]
 *
 * Move : [ MOVE, StepperUsed, Duration (f64), InitialSpeed (f64), Acceleration(f64), values...(uint32[])]
 *   ex: [ COMMANDS.MOVE, 0b00000111, 1e-3, 4, 5, 1234, 5678, 9101]
 */

export class AGCODERunner {
  static STEPPERS_STEP_REG: number      = 0;
  static STEPPERS_DIRECTION_REG: number = 1;
  static STEPPERS_ENABLED_REG: number   = 2;
  static PWM_REG: number                = 3;

  static GPIO_CS_PIN: number            = 7;
  static GPIO_PL_PIN: number            = 11;
  static GPIO_GROUP_SIZE: number        = 6;


  public config: any;
  public time: number;

  public gpioController: GPIOController;
  public sharedArray: SharedBufferStream;

  public currentMove: StepperMovement | null;
  public stepping: boolean;
  public moveStack: StepperMovement[];
  public moveStackIndex: number = 0;
  public pwm: PWM[];

  public loopTime = { sum: 0, max: 0, min: Infinity, iter: 0 };

  constructor(config: any) {
    this.config = config;
    this.time = GetTime();
    this.sharedArray = SharedBufferStream.create();

    this.initGPIO();
    this.stopAll();

    this.enableSteppers(0b11111111);
  }

  // sudo ionice -c 2 -n 0 nice -n -20 node loop.js
  // sudo ionice -c 2 -n 0 nice -n -20 node run.js
  start(): void {
    while(true) {
      const time: number = GetTime();
      const loopTime: number = time - this.time;

      this.updateCommands();

      this.updateMovement(time, loopTime);
      this.updatePWM();

      this.gpioController.update();

      this.time = time;

      this.loopTime.max = Math.max(this.loopTime.max, loopTime);
      this.loopTime.min = Math.min(this.loopTime.min, loopTime);
      this.loopTime.sum += loopTime;
      this.loopTime.iter++;

      if(this.loopTime.sum > 1) {
        console.log(`min: ${this.loopTime.min}, max: ${this.loopTime.max}, avg: ${this.loopTime.sum / this.loopTime.iter}; iter: ${this.loopTime.iter}`);
        this.loopTime.max = 0;
        this.loopTime.min = Infinity;
        this.loopTime.sum = 0;
        this.loopTime.iter = 0;
        this.time = GetTime();
      }

      // break;
    }

    // setImmediate(() => this.mainLoop());
    // process.nextTick(() => this.mainLoop());
    // this.mainLoop();
  }

  updateCommands(): void {
    if(this.sharedArray.readable) {
      this.sharedArray.receive();
      const data: Uint8Array = this.sharedArray.data;
      // TODO
      // console.log(data.join(', '));
      for(let i = 0, l = data.length; i < l; i++) {
        switch(data[i]) {
          case 0x10:
            const decoder = new StepperMovementDecoder();
            while(!decoder.done) {
              i++;
              decoder.next(data[i]);
            }
            this.moveStack.push(decoder.output);
            // console.log(decoder.output);
            break;
          default:
            throw new Error(`Unexpected command code 0x${data[i].toString(16)}`);
        }
      }
      this.sharedArray.send();
    }
  }

  updateMovement(time: number, loopTime: number): void {
    if(this.stepping) { //  && (loopTime > 40e-6)
      this.gpioController.outBuffer[AGCODERunner.STEPPERS_STEP_REG] = 0b00000000;
      // this.gpioController.outBuffer[AGCODERunner.STEPPERS_STEP_REG] = 0b11111111;
      this.stepping = false;
    } else {
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

        let move: StepperMove;
        for(let i = 0, l = this.currentMove.moves.length; i < l; i++) {
          move = this.currentMove.moves[i];

          if(move.current < Math.abs(move.target)) { // !move.finished
            finished = false;
            if(
              (elapsedTime > this.currentMove.duration)
              || ((Math.abs(Math.round(positionFactor * move.target)) - move.current) > 0)
            ) { // must step
              move.current++;
              stepsByte |= 1 << i;
              if(move.target > 0) directionByte |= 1 << i;
            }
          }
        }

        // this.gpioController.outBuffer[AGCODERunner.STEPPERS_STEP_REG] = stepsByte;
        // this.gpioController.outBuffer[AGCODERunner.STEPPERS_DIRECTION_REG] = directionByte;
        this.gpioController.outBuffer[0] = stepsByte;
        this.gpioController.outBuffer[1] = directionByte;
        this.stepping = true;

        if(finished) {
          this.currentMove = null;
        }
      }

      // if((this.currentMove === null) && (this.moveStack.length > 0)) {
      if((this.currentMove === null) && (this.moveStackIndex < this.moveStack.length)) {
        // this.currentMove = this.moveStack.shift();
        this.currentMove = this.moveStack[this.moveStackIndex];
        this.moveStackIndex++;
        // for(let i = 0, l = this.currentMove.moves.length; i < l; i++) {
        //   this.currentMove.moves[i].current = 0;
        // }
        this.currentMove.initialTime = GetTime();
      }
    }
  }

  updatePWM(): void {
    let mask: number = 0b00000000;
    for(let i = 0, l = this.pwm.length; i < l; i++) {
      if(this.pwm[i] !== null) {
        mask |= (this.pwm[i].getState() << i);
      }
    }
    this.gpioController.outBuffer[AGCODERunner.PWM_REG] = mask;
  }


  updateEndStops(): void {

  }


  stopAll(): void {
    this.currentMove = null;
    this.stepping = false;
    this.moveStack = [];
    this.pwm = [null, null, null, null, null, null, null, null];

    this.enableSteppers(0b00000000);
  }

  addMovements(movements: StepperMovement[]): void {
    Array.prototype.push.apply(this.moveStack, movements);
  }

  addPWM(pin: number, pwm: PWM | null): void {
    this.pwm[pin] = pwm;
  }


  enableSteppers(mask: number) {
    this.gpioController.outBuffer[AGCODERunner.STEPPERS_ENABLED_REG] = ~mask;
  }


  protected initGPIO(): void {
    GPIOController.init();

    this.gpioController = new GPIOController(
      AGCODERunner.GPIO_CS_PIN,
      AGCODERunner.GPIO_PL_PIN,
      AGCODERunner.GPIO_GROUP_SIZE
    );
  }
}


function linearMove(values: number[], duration: number): StepperMovement[] {
  const stepperMovements: StepperMovement[] = [];

  const halfDuration: number = duration / 2;
  const acceleration: number = 2 / (halfDuration * halfDuration);

  let stepperMovement: StepperMovement = new StepperMovement();
  for (let i = 0; i < values.length; i++) {
    stepperMovement.moves.push(new StepperMove(i, values[i] / 2));
  }

  stepperMovement.duration = halfDuration;
  stepperMovement.initialSpeed = 0;
  stepperMovement.acceleration = acceleration;

  stepperMovements.push(stepperMovement);


  stepperMovement = new StepperMovement();
  for (let i = 0; i < values.length; i++) {
    stepperMovement.moves.push(new StepperMove(i, values[i] / 2));
  }

  stepperMovement.duration = halfDuration;
  stepperMovement.initialSpeed = acceleration * halfDuration;
  stepperMovement.acceleration = -acceleration;

  stepperMovements.push(stepperMovement);


  return stepperMovements;
}

function square(side: number, duration: number): StepperMovement[] {
  return [
    ...linearMove([side, 0], duration / 4),
    ...linearMove([0, side], duration / 4),
    ...linearMove([-side, 0], duration / 4),
    ...linearMove([0, -side], duration / 4),
  ];
}

function test() {
  // const pwm = new PWM(0.1, 1);
  // console.log(pwm.getState());

  const runner = new AGCODERunner(config);

  // runner.addPWM(0, new PWM(0.1, 1));
  // runner.addPWM(0, new PWM(0.1, 0.001));
  // runner.addMovements(square(1000, 8));
  // runner.moveStack.push(linearMove([1000], 5));

  // let i: number = 0;
  // while(i < 1000) {
  //   this.addMovements(square(6400 * 2, 8));
  //   // await $delay(4000);
  //   i++;
  // }

  // let i: number = 0;
  // while(i < 10) {
  //   const dist: number = 6400 * 10;
  //   const time: number = 8;
  //   runner.addMovements(linearMove([0, 0, dist], time));
  //   runner.addMovements(linearMove([0, 0, -dist], time));
  //   // await $delay(4000);
  //   i++;
  // }
}

// test();



const runner = new AGCODERunner(config);

// let i: number = 0;
// while(i < 2) {
//   const dist: number = 6400 * 10;
//   const time: number = 8;
//   // this.addMovements(linearMove([0, 0, dist], time));
//   // this.addMovements(linearMove([0, 0, -dist], time));
//   this.addMovements(square(6400 * 4, 16));
//   // await $delay(4000);
//   i++;
// }

// runner.addMovements(linearMove([0, 0, -6400 * 4], 4));
// runner.addMovements(linearMove([0, 0, -6400 * 4], 4));
// runner.addMovements(linearMove([0, 0, -6400 * 4], 4));
// runner.addMovements(linearMove([0, 0, -6400 * 4], 4));

runner.start();
