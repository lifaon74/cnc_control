import { config } from './config';
import { StepperMove, StepperMovement } from './StepperMovement';
import { codec } from './classes/codec';
import { GetTime } from './classes/misc';
import { GPIOController, SPIController } from './gpio';





export class PWM {
  public value: number;
  public period: number;

  protected initialTime: number;

  constructor(value: number, period: number) {
    this.value = value;
    this.period = period;
    this.initialTime = GetTime();
  }

  getState(): number {
    return ((this.initialTime % this.period) < this.period) ? 1 : 0;
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

  public currentMove: StepperMovement | null;
  public moveStack: StepperMovement[];
  public pwm: PWM[];

  constructor(config: any) {
    this.config = config;
    this.time = GetTime();

    this.initGPIO();
    this.stopAll();

    this.enableSteppers(0b11111111);

    this.mainLoop();
  }

  mainLoop(): void {
    const time: number = GetTime();
    // const loopTime: number = time - this.time;

    this.updateMovement(time);
    this.updatePWM();

    this.gpioController.update();
    // console.log(
    //   this.outBuffer[AGCODERunner.STEPPERS_STEP_REG].toString(2),
    //   this.outBuffer[AGCODERunner.STEPPERS_DIRECTION_REG].toString(2)
    // );

    this.time = time;
    setImmediate(() => this.mainLoop());
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


      this.gpioController.outBuffer[AGCODERunner.STEPPERS_STEP_REG] = stepsByte;
      this.gpioController.outBuffer[AGCODERunner.STEPPERS_DIRECTION_REG] = directionByte;

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

  updatePWM(): void {
    let mask: number = 0b00000000;
    for(let i = 0, l = this.pwm.length; i < l; i++) {
      if(this.pwm[i] !== null) {
        mask |= (this.pwm[i].getState() << i);
      }
    }
    this.gpioController.outBuffer[AGCODERunner.PWM_REG] = mask;
  }





  stopAll(): void {
    this.currentMove = null;
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
    this.gpioController.outBuffer[AGCODERunner.STEPPERS_ENABLED_REG] = mask;
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
  // const pwm = new PWM(0.1, 1);
  // console.log(pwm.getState());


  const runner = new AGCODERunner(config);
  runner.addPWM(1, new PWM(0.5, 2));
  // runner.addMovements(square(1000, 8));
  // runner.moveStack.push(linearMove([1000], 5));
}


test();


