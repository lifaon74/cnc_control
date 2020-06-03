import {
  GetStandardMaximizationProblemMatrixColumnCount, GetStandardMaximizationProblemMatrixRowCount,
  SetUpStandardMaximizationProblemMatrixSlackVariables, SolveAndGetSolutionsOfStandardMaximizationProblemMatrix
} from './helpers/standard-maximization-problem';
import { TArrayLikeTypedConstructor, TNumberArray } from './helpers/types';
import { MatrixToString } from './helpers/math';
// import { CyclicTypedVectorArray } from './classes/cyclic/CyclicTypedVectorArray';
import { debugCyclicRange } from './classes/cyclic/CyclicRange';
import { CyclicTypedVectorArray } from './classes/cyclic/CyclicTypedVectorArray';

const MOTOR_STEPS = 200;
const MICROSTEPS = 32;
// const STEPS_PER_TURN = MOTOR_STEPS * MICROSTEPS;
const STEPS_PER_TURN = 1000;


const ACCELERATION_LIMIT = STEPS_PER_TURN / (1 / 1);
const SPEED_LIMIT = STEPS_PER_TURN / (1 / 2); // 1 turn / s | max 6.25
const JERK_LIMIT = STEPS_PER_TURN / (16 / 1) * 0;


export class DynamicTypedArrayCollection<ArrayBufferView> {

  public readonly buffers: { [key: string]: ArrayBufferView };
  public allocated: number;
  public _length: number;

}

/*------------------------------------------------------------*/

// [acceleration, velocity, ...distance[i]{i}]
export class OptimizedMovementList extends CyclicTypedVectorArray<Float64Array> {
  public readonly axisCount: number;

  constructor(
    axisCount: number,
    size?: number
  ) {
    const vectorLength: number = 2 + axisCount
    super(
      new Float64Array((size === void 0) ? (vectorLength * 1e6) : size),
      vectorLength
    );
    this.axisCount = axisCount;
  }
}




export function MovementOptimizerCreateMaximizationMatrix<TMatrix extends TNumberArray>(
  ctor: TArrayLikeTypedConstructor<TMatrix>,
  axisCount: number,
): [TMatrix, number, number] {
  const variableCount: number = 2;
  const constraintCount: number = (axisCount * 2) /* jerk limits */ + 2 /* speed limits */;
  const rows: number = GetStandardMaximizationProblemMatrixRowCount(constraintCount);
  const columns: number = GetStandardMaximizationProblemMatrixColumnCount(variableCount, constraintCount);
  return [
    new ctor(rows * columns),
    rows,
    columns,
  ];
}


export function FillMovementMaximizationMatrix(
  matrix: TNumberArray,
  rows: number,
  columns: number,
  axisCount: number,
  movementA: TNumberArray,
  movementB: TNumberArray,
  jerkLimitsA: TNumberArray,
  jerkLimitsB: TNumberArray,
  normalizedSpeedLimitA: number,
  normalizedSpeedLimitB: number,
): void {
  // variables: (normalizedSpeedA, normalizedSpeedB)
  // maximize: normalizedSpeedA + normalizedSpeedB

  // 1) set slack variables
  SetUpStandardMaximizationProblemMatrixSlackVariables(matrix, rows, columns);

  // 2) set constraints
  const lastColumnIndex: number = (columns - 1) * rows;
  let row: number = 0;

  // 2.a) set jerk constraints
  for (let i: number = 0; i < axisCount; i++) { // for each axis
    const distanceA: number = movementA[i];
    const distanceB: number = movementB[i];
    const jerkLimit: number = Math.min(jerkLimitsA[i], jerkLimitsB[i]);

    // abs(distanceA * normalizedSpeedA - distanceB * normalizedSpeedB) < jerkLimit
    // => MUST be decomposed in two equations because 'abs' is not supported:

    // (+distanceA * normalizedSpeedA - distanceB * normalizedSpeedB) < jerkLimit
    matrix[row] = distanceA;
    matrix[row + rows] = -distanceB;
    matrix[row + lastColumnIndex] = jerkLimit;
    row++;

    // (-distanceA * normalizedSpeedA + distanceB * normalizedSpeedB) < jerkLimit
    matrix[row] = -distanceA;
    matrix[row + rows] = distanceB;
    matrix[row + lastColumnIndex] = jerkLimit;
    row++;
  }

  // 2.b) set speed constraints
  // 1 * normalizedSpeedA + 0 * normalizedSpeedB < normalizedSpeedLimitA
  // => normalizedSpeedA < normalizedSpeedLimitA
  matrix[row] = 1;
  matrix[row + rows] = 0;
  matrix[row + lastColumnIndex] = normalizedSpeedLimitA;
  row++;

  // => normalizedSpeedB < normalizedSpeedLimitA
  matrix[row] = 0;
  matrix[row + rows] = 1;
  matrix[row + lastColumnIndex] = normalizedSpeedLimitB;
  row++;

  // 3) set maximize => normalizedSpeedA + normalizedSpeedB
  // note that coefficients are inverted
  matrix[row] = -1;
  matrix[row + rows] = -1;
}



export function DecomposeMovement(
  normalizedStartSpeed: number,
  normalizedEndSpeed: number,
  normalizedSpeedLimit: number,
  normalizedAccelerationLimit: number,
): void {
  // a decomposed movement have the following phases: acceleration, constant speed, deceleration

  // 1) compute the point were we accelerate as fast as possible and decelerate as fast as possible

  // ta, tb => time to reach junction peak of full acceleration and deceleration
  // ta for acceleration, tb for deceleration

  const ta: number = (
      Math.sqrt(
        ((normalizedStartSpeed * normalizedStartSpeed) + (normalizedEndSpeed * normalizedEndSpeed)) / 2
        + normalizedAccelerationLimit
      ) - normalizedStartSpeed
    ) / normalizedAccelerationLimit;

  const tb: number = ta + (normalizedStartSpeed - normalizedEndSpeed) / normalizedAccelerationLimit;

  // 2) compute the 3 decomposed movement's times => t0, t1, t2

  // compute acceleration time having a speed limit
  const t0: number = Math.min(
    ta,
    (normalizedSpeedLimit - normalizedStartSpeed) / normalizedAccelerationLimit /* time to reach speed limit from normalizedStartSpeed */
  );

  // compute deceleration time having a speed limit
  const t2: number = Math.min(
    tb,
    (normalizedSpeedLimit - normalizedEndSpeed) / normalizedAccelerationLimit /* time to reach speed limit from normalizedEndSpeed */
  );

  // compute the max achieved speed
  const normalizedMaxSpeed: number = normalizedAccelerationLimit * t0 + normalizedStartSpeed;

  // d0, d1, d2 => distances of the 3 decomposed children
  const d0: number = (0.5 * normalizedAccelerationLimit * t0 * t0) + (normalizedStartSpeed * t0);
  const d2: number = (0.5 * normalizedAccelerationLimit * t2 * t2) + (normalizedEndSpeed * t2);
  const d1: number = 1 - d0 - d2;

  const t1: number = d1 / normalizedMaxSpeed;

  //     // acceleration
//     if (!Float.isNull(t0, precision)) {
//       // console.log('i', i, 'vi', initialSpeed, 'vf', finalSpeed, 'al', accelerationLimit);
//
//       movementsSequence._buffers['indices'][movementsSequenceLength] = index;
//       movementsSequence._buffers['times'][movementsSequenceLength] = t0;
//       movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = initialSpeed / d0;
//       movementsSequence._buffers['accelerations'][movementsSequenceLength] = accelerationLimit / d0;
//
//       for (let j = 0, l = this.children.length; j < l; j++) {
//         movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d0;
//       }
//
//       movementsSequenceLength++;
//     }
//
//     // linear
//     if (!Float.isNull(t1, precision)) {
//       movementsSequence._buffers['indices'][movementsSequenceLength] = index;
//       movementsSequence._buffers['times'][movementsSequenceLength] = t1;
//       movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = v0_max / d1;
//       // movementsSequence.accelerations[movementsSequenceLength] = 0;
//
//       for (let j = 0, l = this.children.length; j < l; j++) {
//         movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d1;
//       }
//
//       movementsSequenceLength++;
//     }
//
//     // deceleration
//     if (!Float.isNull(t2, precision)) {
//       movementsSequence._buffers['indices'][movementsSequenceLength] = index;
//       movementsSequence._buffers['times'][movementsSequenceLength] = t2;
//       movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = v0_max / d2;
//       movementsSequence._buffers['accelerations'][movementsSequenceLength] = -normalizedMovesSequence._buffers['accelerationLimits'][i] / d2;
//
//       for (let j = 0, l = this.children.length; j < l; j++) {
//         movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d2;
//       }
//
//       movementsSequenceLength++;
//     }

}

// private _decompose(normalizedMovesSequence: ConstrainedNormalizedMovementSequence, precision: number = 1e-12): OptimizedSynchronizedMovementsSequence {
//   const movementsSequence: OptimizedSynchronizedMovementsSequence = new OptimizedSynchronizedMovementsSequence(this.children.length);
//   movementsSequence.require(normalizedMovesSequence.length * 3); // each movement could be split in 3 moves at max
//   let movementsSequenceLength: number = 0;
//
//   let index: number;
//   let initialSpeed: number, finalSpeed: number;
//   let speedLimit: number, accelerationLimit: number;
//
//   let ta: number, tb: number, t0: number, t1: number, t2: number;
//   let v0_max: number;
//   let d0: number, d1: number, d2: number;
//
//
//   for (let i = 0, length = normalizedMovesSequence.length; i < length; i++) {
//     index = this._buffers['indices'][i];
//
//     initialSpeed = normalizedMovesSequence._buffers['initialSpeeds'][i];
//     finalSpeed = normalizedMovesSequence._buffers['finalSpeeds'][i];
//     speedLimit = normalizedMovesSequence._buffers['speedLimits'][i];
//     accelerationLimit = normalizedMovesSequence._buffers['accelerationLimits'][i];
//
//     // first we compute the point were we accelerate as fast as possible and decelerate as fast as possible
//     // ta, tb => time to reach junction peak of full acceleration and deceleration
//     // ta for acceleration, tb for deceleration
//     ta = (Math.sqrt(
//       (initialSpeed * initialSpeed + finalSpeed * finalSpeed) / 2 +
//       accelerationLimit /* * this.distance */
//     ) - initialSpeed) / accelerationLimit;
//     tb = ta + (initialSpeed - finalSpeed) / accelerationLimit;
//
//     // t0, t1, t2 => times of the 3 decomposed children
//     t0 = Math.min(ta, (speedLimit - initialSpeed) / accelerationLimit); // get full acceleration time according to the speed limit
//     t2 = Math.min(tb, (speedLimit - finalSpeed) / accelerationLimit); // get full deceleration time according to the speed limit
//
//     // max achieved speed
//     v0_max = accelerationLimit * t0 + initialSpeed;
//     // v1_max = this.accelerationLimit * t2 + this.finalSpeed;
//
//     // d0, d1, d2 => distances of the 3 decomposed children
//     d0 = 0.5 * accelerationLimit * t0 * t0 + initialSpeed * t0;
//     d2 = 0.5 * accelerationLimit * t2 * t2 + finalSpeed * t2;
//     d1 = 1 - d0 - d2;
//
//     t1 = d1 / v0_max;
//
//
//     // console.log('t=>', t0, t1, t2, ta, tb);
//     // // console.log('v=>', v0_max, v1_max);
//     // console.log('d=>', d0, d1, d2);
//     // console.log('--');
//
//     // acceleration
//     if (!Float.isNull(t0, precision)) {
//       // console.log('i', i, 'vi', initialSpeed, 'vf', finalSpeed, 'al', accelerationLimit);
//
//       movementsSequence._buffers['indices'][movementsSequenceLength] = index;
//       movementsSequence._buffers['times'][movementsSequenceLength] = t0;
//       movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = initialSpeed / d0;
//       movementsSequence._buffers['accelerations'][movementsSequenceLength] = accelerationLimit / d0;
//
//       for (let j = 0, l = this.children.length; j < l; j++) {
//         movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d0;
//       }
//
//       movementsSequenceLength++;
//     }
//
//     // linear
//     if (!Float.isNull(t1, precision)) {
//       movementsSequence._buffers['indices'][movementsSequenceLength] = index;
//       movementsSequence._buffers['times'][movementsSequenceLength] = t1;
//       movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = v0_max / d1;
//       // movementsSequence.accelerations[movementsSequenceLength] = 0;
//
//       for (let j = 0, l = this.children.length; j < l; j++) {
//         movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d1;
//       }
//
//       movementsSequenceLength++;
//     }
//
//     // deceleration
//     if (!Float.isNull(t2, precision)) {
//       movementsSequence._buffers['indices'][movementsSequenceLength] = index;
//       movementsSequence._buffers['times'][movementsSequenceLength] = t2;
//       movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = v0_max / d2;
//       movementsSequence._buffers['accelerations'][movementsSequenceLength] = -normalizedMovesSequence._buffers['accelerationLimits'][i] / d2;
//
//       for (let j = 0, l = this.children.length; j < l; j++) {
//         movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d2;
//       }
//
//       movementsSequenceLength++;
//     }
//
//   }
//
//   movementsSequence.length = movementsSequenceLength;
//   // console.log(movementsSequence.toString());
//
//   return movementsSequence;
// }


/*---*/


export interface IMovementConstraint {
  accelerationLimit: number;
  speedLimit: number;
  jerkLimit: number;
}

export class MovementOptimizer {
  public readonly axisCount: number;
  public readonly constraints: IMovementConstraint[];

  public readonly optimizedMovements: OptimizedMovementList;

  // protected distances: number[];
  // protected accelerationLimits: number[];
  // protected speedLimits: number[];
  // protected jerkLimits: number[];

  protected normalizedAccelerationLimits: number[];
  protected normalizedSpeedLimits: number[];

  protected maximizationMatrix: Float64Array;
  protected maximizationMatrixRows: number;
  protected maximizationMatrixColumns: number;
  protected maximizationMatrixSolution: Float64Array;

  constructor(
    constraints: IMovementConstraint[]
  ) {
    this.axisCount = constraints.length;
    // if (constraints.length !== this.axisCount) {
    //   throw new Error(`constraints' length must be ${ this.axisCount }`)
    // }
    this.constraints = constraints;
    this.optimizedMovements = new OptimizedMovementList(this.axisCount);
    [
      this.maximizationMatrix,
      this.maximizationMatrixRows,
      this.maximizationMatrixColumns
    ] = MovementOptimizerCreateMaximizationMatrix<Float64Array>(Float64Array, this.axisCount);
    this.maximizationMatrixSolution = new Float64Array(2);
  }

  /**
   * Adds a movement to optimize
   *   movement => [X, Y, Z, etc...]
   */
  add(
    movement: TNumberArray,
    constraints: IMovementConstraint[] = this.constraints
  ): void {
    // 1) compute normalized acceleration and speed limits
    let normalizedAccelerationLimit: number = Number.POSITIVE_INFINITY;
    let normalizedSpeedLimit: number = Number.POSITIVE_INFINITY;

    for (let i: number = 0; i < this.axisCount; i++) {
      const constraint: IMovementConstraint = constraints[i];
      const absoluteDistance: number = Math.abs(movement[i]);
      normalizedAccelerationLimit = Math.min(normalizedAccelerationLimit, constraint.accelerationLimit / absoluteDistance);
      normalizedSpeedLimit = Math.min(normalizedSpeedLimit, constraint.speedLimit / absoluteDistance);
    }

    console.log(normalizedAccelerationLimit, normalizedSpeedLimit);

    // 1) compute best initial and final speed
    //  a) compute best initial and final speed from first movement to last one, assuming fastest speed at the end of the movement
    //  b) compute best initial and final speed from last movement to first one, assuming fastest speed at the beginning of the movement

    const normalizedInitialSpeed: number = 0;

    const normalizedFinalSpeedLimit = Math.min(
      normalizedSpeedLimit,
      (normalizedAccelerationLimit === 0)
        ? normalizedInitialSpeed
        : Math.sqrt(normalizedInitialSpeed * normalizedInitialSpeed + 2 * normalizedAccelerationLimit)
    );



    console.log(normalizedFinalSpeedLimit);

    FillMovementMaximizationMatrix(
      this.maximizationMatrix,
      this.maximizationMatrixRows,
      this.maximizationMatrixColumns,
      this.axisCount,
      movement,
      Array.from(movement, v => -v),
      constraints.map(_ => _.jerkLimit),
      constraints.map(_ => _.jerkLimit), /* TODO replace by next movement jerk limits */
      normalizedFinalSpeedLimit,
      Math.min(normalizedFinalSpeedLimit, normalizedFinalSpeedLimit /* TODO replace by normalized next movement speed limit */),
    );

    SolveAndGetSolutionsOfStandardMaximizationProblemMatrix(
      this.maximizationMatrix,
      this.maximizationMatrixRows,
      this.maximizationMatrixColumns,
      this.maximizationMatrixSolution,
    );

    console.log(
      MatrixToString(
        this.maximizationMatrix,
        this.maximizationMatrixRows,
        this.maximizationMatrixColumns,
      )
    );

    console.log(this.maximizationMatrixSolution);

    // normalizedMovesSequence._buffers['finalSpeeds'][i] = solutions.values[0];
    // normalizedMovesSequence._buffers['initialSpeeds'][i + 1] = solutions.values[1];
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

export function debugMovementOptimizer() {
  const defaultConstraint: IMovementConstraint = {
    accelerationLimit: 1,
    speedLimit: 1,
    jerkLimit: 0.1,
  };

  const constraints: IMovementConstraint[] = [
    defaultConstraint,
    defaultConstraint,
  ];

  const optimizer = new MovementOptimizer(constraints);

  optimizer.add([1, 2]);
}

export function runDebug() {
  // debugStandardMaximizationProblem();
  // debugStandardMaximizationProblemSolver();
  // debugMovementOptimizer();
  // debugCyclicIndex();
  debugCyclicRange();

}
