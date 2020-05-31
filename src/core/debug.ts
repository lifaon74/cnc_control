
const MOTOR_STEPS = 200;
const MICROSTEPS = 32;
// const STEPS_PER_TURN = MOTOR_STEPS * MICROSTEPS;
const STEPS_PER_TURN = 1000;


const ACCELERATION_LIMIT = STEPS_PER_TURN / (1 / 1);
const SPEED_LIMIT = STEPS_PER_TURN / (1 / 2); // 1 turn / s | max 6.25
const JERK_LIMIT = STEPS_PER_TURN / (16 / 1) * 0;



/*------------------------------------------------------------*/



/**
 * Builds a MaximizationMatrix between movements at index_0 and index_1 according to some speed limits (final and initial).
 * This matrix will be used to solve the best final and initial speeds :
 * (final speed of movement[index_0] and initial speed of movement[index_1])
 *
 * The problem, has this form:
 *  for each axis (i) :
 *    - abs(value[index_0][i] * finalSpeed - value[index_1][i] * initialSpeed) < jerk[i]
 *      => here 'abs' will be replaced by 2 rows instead:
 *        - (+value[index_0][i] * finalSpeed - value[index_1][i] * initialSpeed) < jerk[i]
 *        - (-value[index_0][i] * finalSpeed + value[index_1][i] * initialSpeed) < jerk[i]
 *        => this mean that the difference between final and initial speeds can't exceed jerk.
 *   set 2 maximum speeds: final and initial
 *
 * After solving the problem, the best final and initial speed will be returned
 */
export function MovementOptimizerGenerateMaximizationMatrix(
  axisCount: number,
  jerkLimits: number[],
  // startConstraints: IMovementConstraint[],
  // endConstraints: IMovementConstraint[],
  // finalSpeedLimit: number,
  // initialSpeedLimit: number,
) {
  // 2 per axes
  // + 2 for max values
  // + 1 for maximization
  const rowsNumber: number = axisCount * 2 + 2 + 1; // also know as m
  // D[i][0] * Ve - D[i][1] * Vi < J[i] => 3 columns
  const columnsNumber: number = 3 + rowsNumber - 1; // also know as n


  const matrix: Float64Array = new Float64Array(rowsNumber * columnsNumber);

  let startConstraint: IMovementConstraint;
  let endConstraint: IMovementConstraint;
  // let row: number = 0;

  // const col_1: number = matrix.m;
  // const col_last: number = (matrix.n - 1) * matrix.m;
  let jerkLimit: number;
  // let value_0: number, value_1: number;

  for (let i = 0; i < axisCount; i++) { // for each axis
    jerkLimit = jerkLimits[i];

    // value_0 = movesSequence._buffers['values'][index_0];
    // value_1 = movesSequence._buffers['values'][index_1];
    //
    // matrix.values[row] = value_0;
    // matrix.values[row + col_1] = -value_1;
    // matrix.values[row + col_last] = jerkLimit;
    // row++;
    //
    // matrix.values[row] = -value_0;
    // matrix.values[row + col_1] = value_1;
    // matrix.values[row + col_last] = jerkLimit;
    // row++;
  }

}


// export function _getNormalizedMovesSequence(): ConstrainedNormalizedMovementSequence {
//   const movesSequence: ConstrainedNormalizedMovementSequence = new ConstrainedNormalizedMovementSequence();
//   movesSequence.length = this._length;
//
//   let move: ConstrainedMovementsSequence;
//   let speedLimit: number, accelerationLimit: number, value: number;
//   for (let i = 0, l = this._length; i < l; i++) {
//     move = this.children[0];
//     value = Math.abs(move._buffers['values'][i]);
//     speedLimit = move._buffers['speedLimits'][i] / value;
//     accelerationLimit = move._buffers['accelerationLimits'][i] / value;
//
//     for (let j = 1, childrenLength = this.children.length; j < childrenLength; j++) {
//       move = this.children[j];
//       value = Math.abs(move._buffers['values'][i]);
//       speedLimit = Math.min(speedLimit, move._buffers['speedLimits'][i] / value);
//       accelerationLimit = Math.min(accelerationLimit, move._buffers['accelerationLimits'][i] / value);
//     }
//
//     // movesSequence.initialSpeeds[i]       = NaN;
//     // movesSequence.finalSpeeds[i]         = NaN;
//     movesSequence._buffers['speedLimits'][i] = speedLimit;
//     movesSequence._buffers['accelerationLimits'][i] = accelerationLimit;
//   }
//
//   return movesSequence;
// }


/*---*/


export type TOptimizedMovement = Float32Array; // [acceleration, velocity, ...distance[i]{i}]

export interface IMovementConstraint {
  accelerationLimit: number;
  speedLimit: number;
  jerkLimit: number;
}

export class MovementOptimizer {
  public readonly axisCount: number;
  public readonly constraints: IMovementConstraint[];

  public readonly movements: TOptimizedMovement[];

  constructor(
    axisCount: number,
    constraints: IMovementConstraint[]
  ) {
    this.axisCount = axisCount;
    if (constraints.length !== this.axisCount) {
      throw new Error(`constraints' length must be ${ this.axisCount }`)
    }
    this.constraints = constraints;
    this.movements = [];
  }

  /**
   * Adds a movement to optimize
   * @param movement => [X, Y, Z, etc...]
   */
  add(movement: number[]): void {
    // 1) compute best initial and final speed
    //  a) compute best initial and final speed from first movement to last one, assuming fastest speed at the end of the movement
    //  b) compute best initial and final speed from last movement to first one, assuming fastest speed at the beginning of the movement

    const initialSpeed: number = 0;

    const finalSpeedLimit = Math.min(
      normalizedMovesSequence._buffers['speedLimits'][i],
      (accelerationLimit === 0) ?
        initialSpeed : Math.sqrt(initialSpeed * initialSpeed + 2 * accelerationLimit)
    );
  }
}



// private _getMaximizationMatrix(index_0: number, index_1: number, finalSpeedLimit: number, initialSpeedLimit: number): Matrix<Float64Array> {
//   // 2 per axes
//   // + 2 for max values
//   // + 1 for maximization
//   const rowsNumber: number = this.children.length * 2 + 2 + 1;
//
// // D[i][0] * Ve - D[i][1] * Vi < J[i] => 3 columns
// const matrix: Matrix<Float64Array> = new Matrix<Float64Array>(rowsNumber, 3 + rowsNumber - 1).empty();
//
// let movesSequence: ConstrainedMovementsSequence;
// let row: number = 0;
//
// const col_1: number = matrix.m;
// const col_last: number = (matrix.n - 1) * matrix.m;
// let jerkLimit: number;
// let value_0: number, value_1: number;
//
// for (let i = 0, l = this.children.length; i < l; i++) { // for each axis
//   movesSequence = this.children[i];
//
//   jerkLimit = Math.min(
//     movesSequence._buffers['jerkLimits'][index_0],
//     movesSequence._buffers['jerkLimits'][index_1]
//   ); //  * move_0.direction  * move_1.direction
//
//   value_0 = movesSequence._buffers['values'][index_0];
//   value_1 = movesSequence._buffers['values'][index_1];
//
//   matrix.values[row] = value_0;
//   matrix.values[row + col_1] = -value_1;
//   matrix.values[row + col_last] = jerkLimit;
//   row++;
//
//   matrix.values[row] = -value_0;
//   matrix.values[row + col_1] = value_1;
//   matrix.values[row + col_last] = jerkLimit;
//   row++;
// }
//
// matrix.values[row] = 1;
// // matrix.values[row + col_1] = 0;
// matrix.values[row + col_last] = finalSpeedLimit;
// row++;
//
// // matrix.values[row] = 0;
// matrix.values[row + col_1] = 1;
// matrix.values[row + col_last] = initialSpeedLimit;
// row++;
//
// matrix.values[row] = -1;
// matrix.values[row + col_1] = -1;
//
// for (let m = 0, l = matrix.m - 1; m < l; m++) {
//   matrix.values[m + (m + 2) * matrix.m] = 1;
// }
//
// return matrix;
// }


export function runDebug() {
  const defaultConstraint: IMovementConstraint = {
    accelerationLimit: ACCELERATION_LIMIT,
    speedLimit: SPEED_LIMIT,
    jerkLimit: JERK_LIMIT,
  };

  const constraints: IMovementConstraint[] = [
    defaultConstraint,
    defaultConstraint,
    defaultConstraint,
  ];

  const optimizer = new MovementOptimizer(constraints);

  optimizer.add([10, 10, 10]);
}
