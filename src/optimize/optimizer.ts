import * as $fs from 'fs';
import { GCODEHelper, GCODECommand } from './gcodeHelper';
import { Stepper } from '../classes/stepper';
import {
  ConstrainedSynchronizedMovementsSequence, ConstrainedMovementsSequence, StepperMovementsSequence,
  StepperMovesSequence, CorrelatedArrayBuffers, OptimizedSynchronizedMovementsSequence, CorrelatedArrayBuffersTree, SynchronizedMovementsSequence, MovementsSequence, OptimizedMovementsSequence
} from '../classes/kinematics';
import { Timer } from '../classes/Timer';
import { Float } from '../classes/lib/Float';



const MOTOR_STEPS = 200;
const MICROSTEPS = 32;
const stepsPerTurn = MOTOR_STEPS * MICROSTEPS;//6400  => /160


const ACCELERATION_LIMIT = stepsPerTurn / (1 / 1);
const SPEED_LIMIT = stepsPerTurn / (1 / 2); // 1 turn / s | max 6.25
const JERK_LIMIT = stepsPerTurn / (16 / 1) * 0;

const IS_BROWSER = (typeof window !== 'undefined');

export const MovementType = {
  UNDEFINED: 'undefined',
  MOVE: 'move',
  SKIRT: 'skirt',
  WALL_OUTER: 'wall-outer',
  WALL_INNER: 'wall-inner',
  FILL: 'fill',
  SUPPORT: 'support',
  BRIDGE: 'bridge'
};

export const MatterSliceMovementTypes: { [key: string]: string } = {
  'SKIRT': MovementType.SKIRT,
  'WALL-OUTER': MovementType.WALL_OUTER,
  'WALL-INNER': MovementType.WALL_INNER,
  'FILL': MovementType.FILL,
  'SUPPORT': MovementType.SUPPORT,
  'BRIDGE': MovementType.BRIDGE
};


export class PWMController {
  constructor(public analogChannel: number,
              public pwmChannel: number,
              public getPWM: (analogValue: number, targetValue: number, currentPWMValue: number) => number) {
  }
}

const STEPPERS: Stepper[] = [
  new Stepper('x', 0, 0, 1, ACCELERATION_LIMIT, SPEED_LIMIT, JERK_LIMIT, stepsPerTurn / 40), // 160
  new Stepper('y', 1, 2, 3, ACCELERATION_LIMIT, SPEED_LIMIT, JERK_LIMIT, stepsPerTurn  / 40),
  new Stepper('z', 2, 4, 5, ACCELERATION_LIMIT, SPEED_LIMIT, JERK_LIMIT, (stepsPerTurn * 5.21)  / 40), // 3316.36
  new Stepper('e', 3, null, null, 1e10, SPEED_LIMIT, JERK_LIMIT, 160 / 6400 * stepsPerTurn),
];

export interface ICONFIG {
  indexSpeedOn: string;
  steppers: Stepper[];
  PWMControllers: PWMController[];
}

export const CONFIG: ICONFIG = {
  indexSpeedOn: 'max',
  steppers: STEPPERS,
  PWMControllers: [
    new PWMController(0, 0, (analogValue: number, targetValue: number, currentPWMValue: number) => {
      return (targetValue / analogValue) * currentPWMValue;
    })
  ]
};




export class GCODEOptimizer {

  static typeRegExp: RegExp = new RegExp('^TYPE:(.+)$');

  /**
   * Extracts from a GCODECommand of matterSlice the movement's type
   * @param {GCODECommand} command
   * @returns {string | null}
   */
  static getMatterSliceMovementType(command: GCODECommand): string | null {
    if(command.comment) {
      const match: RegExpExecArray = this.typeRegExp.exec(command.comment);
      if(match !== null) {
        const type: string = match[1];
        if(type in MatterSliceMovementTypes) {
          return MatterSliceMovementTypes[type];
        } else {
          console.warn('Unknown type : ' + type);
          return MovementType.UNDEFINED;
        }
      }
    }
    return null;
  }

  static layerRegExp: RegExp = new RegExp('^LAYER:(\\d+)$');

  /**
   * Extracts from a GCODECommand of matterSlice the layer
   * @param {GCODECommand} command
   * @returns {number | null}
   */
  static getMatterSliceLayer(command: GCODECommand): number | null {
    if(command.comment) {
      const match: RegExpExecArray = this.layerRegExp.exec(command.comment);
      if(match !== null) {
        const layer: number = parseInt(match[1]);
        if(isNaN(layer)) {
          console.warn('Unknown layer : ' + layer);
        } else {
          return layer;
        }
      }
    }
    return null;
  }


  static optimizeFile(path: string, config: ICONFIG): Promise<any> {
    const timer: Timer = new Timer();
    return GCODEHelper.parseFilePromise(path)
      .then((gcodeCommands: GCODECommand[]) => {
        timer.disp('opened in', 'ms');

        timer.clear();
        const movementsSequence: ConstrainedSynchronizedMovementsSequence = this.parseGCODECommands(gcodeCommands, config);
        timer.disp('converted in', 'ms');

        const optimizedMovementsSequence: OptimizedSynchronizedMovementsSequence = this.optimizeConstrainedMovementsSequence(movementsSequence);

        console.log(optimizedMovementsSequence.toGCODECommands(gcodeCommands).map(_ => _.toString(1e-3)).join('\n'));
        // console.log(optimizedMovementsSequence.getBuffer('indices').join(', '));
        // this.virtualRun(optimizedMovementsSequence);

        return this.createAGCODEFile(
          '../assets/test.bin.agcode',
          optimizedMovementsSequence,
          { binary: false }
        );
      });
  }

  /**
   * Converts a list of GCODECommand[] to a ConstrainedSynchronizedMovementsSequence.
   * @param {GCODECommand[]} commands
   * @param {ICONFIG} config
   * @returns {ConstrainedSynchronizedMovementsSequence}
   */
  static parseGCODECommands(commands: GCODECommand[], config: ICONFIG): ConstrainedSynchronizedMovementsSequence {
    const movementsSequence: ConstrainedSynchronizedMovementsSequence = new ConstrainedSynchronizedMovementsSequence(config.steppers.length);
    movementsSequence.require(commands.length);
    let movementsSequenceLength: number = 0;

    let stepper: Stepper;
    let command: GCODECommand;
    let movesSequence: ConstrainedMovementsSequence;

    const localConfig: any = {
      unitFactor: 1, // 1 for millimeters, 25.4 for inches,
      absolutePosition: true,
      position: {},
      speed: 1e4, // mm/s
      type: MovementType.UNDEFINED,
      layer: 0
    };

    for(let i = 0; i < config.steppers.length; i++) {
      localConfig.position[config.steppers[i].name] = 0;
    }

    for(let j = 0; j < commands.length; j++) {
      command = commands[j];
      // console.log(command);
      // if(j > 30) break;

      const type: string = this.getMatterSliceMovementType(command);
      if(type) localConfig.type = type;

      switch(command.command) {
        case 'G0':
        case 'G1':
          // console.log(command.params);
          if(command.params['f']) {
            localConfig.speed = (command.params['f'] * localConfig.unitFactor) / 60;
          }

          for(let i = 0; i < config.steppers.length; i++) {
            stepper = config.steppers[i];
            movesSequence = movementsSequence.children[i];

            let value: number = command.params[stepper.name];
            let delta: number = 0;

            if(typeof value === 'number') {
              value = value * localConfig.unitFactor * stepper.stepsPerMm; // convert value to steps

              if(localConfig.absolutePosition) {
                delta = (value - localConfig.position[stepper.name]);
                localConfig.position[stepper.name] = value;
              } else {
                delta = value;
                localConfig.position[stepper.name] += value;
              }
            }

            movesSequence._buffers['values'][movementsSequenceLength] = delta;
            movesSequence._buffers['speedLimits'][movementsSequenceLength] = Math.min(stepper.speedLimit, localConfig.speed * stepper.stepsPerMm);
            movesSequence._buffers['accelerationLimits'][movementsSequenceLength] = stepper.accelerationLimit;
            movesSequence._buffers['jerkLimits'][movementsSequenceLength] = stepper.jerkLimit;
          }

          movementsSequence._buffers['indices'][movementsSequenceLength] = j;
          movementsSequenceLength++;
          break;

        case 'G20': // unit = inches
          localConfig.unitFactor = 25.4;
          break;
        case 'G21': // unit = millimeters
          localConfig.unitFactor = 1;
          break;

        case 'G90': // absolute position
          localConfig.absolutePosition = true;
          break;
        case 'G91': // relative position
          localConfig.absolutePosition = false;
          break;
        case 'G92': // define position
          for(let i = 0; i < config.steppers.length; i++) {
            stepper = config.steppers[i];
            localConfig.position[stepper.name] = command.params[stepper.name] || 0;
          }
          break;
      }
    }

    movementsSequence.length = movementsSequenceLength;

    return movementsSequence;
  }

  /**
   * Optimizes a ConstrainedSynchronizedMovementsSequence
   * @param {ConstrainedSynchronizedMovementsSequence} movementsSequence
   * @returns {OptimizedSynchronizedMovementsSequence}
   */
  static optimizeConstrainedMovementsSequence(movementsSequence: ConstrainedSynchronizedMovementsSequence): OptimizedSynchronizedMovementsSequence {
    const timer = new Timer();
    let length: number = movementsSequence.length;
    timer.clear();

    movementsSequence.roundValues();
    movementsSequence.reduce();

    timer.disp('reduced in', 'ms');
    console.log(`reduced ratio ${length} => ${movementsSequence.length}`);

    timer.clear();
    const optimizedMovementsSequence: OptimizedSynchronizedMovementsSequence = movementsSequence.optimize();
    timer.disp('optimized in', 'ms');


    length = optimizedMovementsSequence.length;
    timer.clear();
    // optimizedMovementsSequence.compact();
    optimizedMovementsSequence.roundValues();
    optimizedMovementsSequence.reduce();
    timer.disp('2nd reduced in', 'ms');
    console.log(`reduced ratio ${length} => ${optimizedMovementsSequence.length}`);

    return optimizedMovementsSequence;
  }




  static createAGCODEFile(
    path: string,
    movementsSequence: OptimizedSynchronizedMovementsSequence,
    options: { binary?: boolean } = {}
  ): Promise<void> {
    return new Promise<void>((resolve: any) => {
      const file: number = $fs.openSync(path, 'w+');
      const movesLength: number = movementsSequence.children.length;
      const moveMask: number = (1 << movesLength) - 1;

      // console.log(movementsSequence.toString());
      if(options.binary) {
        const times: Buffer         = Buffer.from(movementsSequence._buffers['times'].buffer as ArrayBuffer);
        const initialSpeeds: Buffer = Buffer.from(movementsSequence._buffers['initialSpeeds'].buffer as ArrayBuffer);
        const accelerations: Buffer = Buffer.from(movementsSequence._buffers['accelerations'].buffer as ArrayBuffer);

        const moves: Buffer[] = [];
        for(let j = 0; j < movesLength; j++) {
          moves[j] = Buffer.from(new Int32Array(movementsSequence.children[j]._buffers['values']).buffer as ArrayBuffer);
        }

        for(let i = 0, length = movementsSequence.length; i < length; i++) {
          let a: number = i * 8;
          let b: number = a + 8;

          $fs.writeSync(file, Buffer.from([0x10]));
          $fs.writeSync(file, Buffer.from([moveMask]));
          $fs.writeSync(file, times.slice(a, b));
          $fs.writeSync(file, initialSpeeds.slice(a, b));
          $fs.writeSync(file, accelerations.slice(a, b));

          a = i * 4;
          b = a + 4;
          for(let j = 0; j < movesLength; j++) {
            // console.log(moves[j].slice(a, b));
            $fs.writeSync(file, moves[j].slice(a, b));
          }
        }
      } else {
        for(let i = 0, length = movementsSequence.length; i < length; i++) {
          $fs.writeSync(file, 'G0 ');
          // $fs.writeSync(file, 'I' + stepperMovementsSequence._buffers.indices[i] + ' ');
          $fs.writeSync(file, 'T' + movementsSequence._buffers.times[i] + ' ');
          $fs.writeSync(file, 'S' + movementsSequence._buffers.initialSpeeds[i] + ' ');
          $fs.writeSync(file, 'A' + movementsSequence._buffers.accelerations[i] + ' ');

          let move: CorrelatedArrayBuffers;
          for(let j = 0; j < movesLength; j++) {
            move = movementsSequence.children[j];
            $fs.writeSync(file, CONFIG.steppers[j].name.toUpperCase() + move._buffers.values[i] + ' ');
          }
          $fs.writeSync(file, '\n');
        }
      }
      resolve();
    });
  }

  static virtualRun(optimizedMovementsSequence: OptimizedSynchronizedMovementsSequence): void {
    let totalTime: number = 0;
    const position: number[] = [];

    for(let i = 0, length = optimizedMovementsSequence.length; i < length; i++) {

      const time: number = optimizedMovementsSequence._buffers['times'][i];
      const acceleration: number =  optimizedMovementsSequence._buffers['accelerations'][i];
      const speed: number =  optimizedMovementsSequence._buffers['initialSpeeds'][i];

      totalTime += optimizedMovementsSequence._buffers.times[i];

      for(let j = 0, l = optimizedMovementsSequence.children.length; j < l; j++) {
        const movement: OptimizedMovementsSequence = optimizedMovementsSequence.children[j];
        const value: number = movement._buffers['values'][i];

        if(position[j] === void 0) position[j] = 0;
        position[j] += value;

        const _value: number = 0.5 * acceleration * time * time + speed * time;
        if(!Float.equals(_value, 1, 1e-9)) {
          console.log(_value, value, ' -> ', time, acceleration, speed);
          throw new Error(`Invalid optimization: ${i}`);
        }
      }
    }

    console.log(optimizedMovementsSequence.toString());
    // console.log(optimizedMovementsSequence.toString(-1, 'times'));
    console.log('virtualRun :');
    console.log(`length ${optimizedMovementsSequence.length}, time ${Timer.toString(totalTime, 's')}, position ${position.join(', ')}`);
    // console.log(optimizedMovementsSequence.times);
  }

}


function createSynchronizedMovementsSequence(size: number = 0, moves: number = 2): SynchronizedMovementsSequence {
  const collection = new SynchronizedMovementsSequence(size, { 'values': Float64Array });
  for(let i = 0; i < moves; i++) {
    collection.children[i] = new MovementsSequence(size, { 'values': Float64Array });
  }
  collection.length = size;
  return collection;
}

function buildSynchronizedMovementsSequence(data: number[][]): SynchronizedMovementsSequence {
  const collection = createSynchronizedMovementsSequence(0, data.length);
  for(let i = 0; i < data.length; i++) {
    collection.children[i]._buffers['values'] = new Float64Array(data[i]);
  }
  return collection;
}


function testAreCollinear() {
  let collection = buildSynchronizedMovementsSequence([[0, 0], [0, 0]]);
  if(!collection.areCollinear(0, 1)) throw new Error('[[0, 0], [0, 0]] should be collinear');

  collection = buildSynchronizedMovementsSequence([[1, 0], [0, 0]]);
  if(!collection.areCollinear(0, 1)) throw new Error('[[1, 0], [0, 0]] should be collinear');

  collection = buildSynchronizedMovementsSequence([[0, 1], [0, 0]]);
  if(!collection.areCollinear(0, 1)) throw new Error('[[0, 1], [0, 0]] should be collinear');

  collection = buildSynchronizedMovementsSequence([[0, 0], [1, 0]]);
  if(!collection.areCollinear(0, 1)) throw new Error('[[0, 0], [1, 0]] should be collinear');

  collection = buildSynchronizedMovementsSequence([[0, 0], [0, 1]]);
  if(!collection.areCollinear(0, 1)) throw new Error('[[0, 0], [0, 1]] should be collinear');

  collection = buildSynchronizedMovementsSequence([[0, 4], [0, 1]]);
  if(!collection.areCollinear(0, 1)) throw new Error('[[0, 4], [0, 1]] should be collinear');

  collection = buildSynchronizedMovementsSequence([[4, 0], [1, 0]]);
  if(!collection.areCollinear(0, 1)) throw new Error('[[4, 0], [1, 0]] should be collinear');

  collection = buildSynchronizedMovementsSequence([[0, 0], [1, 1]]);
  if(!collection.areCollinear(0, 1)) throw new Error('[[0, 0], [1, 1]] should be collinear');

  collection = buildSynchronizedMovementsSequence([[-1, 0], [1, 0]]);
  if(collection.areCollinear(0, 1)) throw new Error('[[-1, 0], [1, 0]] should not be collinear');

  collection = buildSynchronizedMovementsSequence([[0, 1], [0, -1]]);
  if(collection.areCollinear(0, 1)) throw new Error('[[0, 1], [0, -1]] should not be collinear');

  collection = buildSynchronizedMovementsSequence([[0, 1], [1, 0]]);
  if(collection.areCollinear(0, 1)) throw new Error('[[0, 1], [1, 0]] should not be collinear');

  collection = buildSynchronizedMovementsSequence([[0, -1], [1, 0]]);
  if(collection.areCollinear(0, 1)) throw new Error('[[0, -1], [1, 0]] should not be collinear');

}

function test() {
  testAreCollinear();
}



function start() {
  test();

  // const fileName: string = 'tower';
  // const fileName: string = 'circle';
  const fileName: string = 'square';
  // const fileName: string = 'thin_tower';
  GCODEOptimizer.optimizeFile('../assets/' + fileName + '.gcode', CONFIG).catch(_ => console.log(_));
}




if(IS_BROWSER) {
  window.onload = start;
} else {
  start();
}








