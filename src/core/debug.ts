import {
  GetStandardMaximizationProblemMatrixColumnCount, GetStandardMaximizationProblemMatrixRowCount,
  SetUpStandardMaximizationProblemMatrixSlackVariables, SolveAndGetSolutionsOfStandardMaximizationProblemMatrix,
  VerifyMaximizationProblemMatrixSolutions
} from './helpers/standard-maximization-problem';
import { TArrayLikeTypedConstructor, TNumberArray } from './helpers/types';
import { FloatIsNull, FloatToString, MatrixToString } from './helpers/math';
// import { CyclicTypedVectorArray } from './classes/cyclic/CyclicTypedVectorArray';
import { CyclicTypedVectorArray } from './classes/cyclic/CyclicTypedVectorArray';
import { CyclicRange } from './classes/cyclic/CyclicRange';

const MOTOR_STEPS = 200;
const MICROSTEPS = 32;
// const STEPS_PER_TURN = MOTOR_STEPS * MICROSTEPS;
const STEPS_PER_TURN = 1000;


const ACCELERATION_LIMIT = STEPS_PER_TURN / (1 / 1);
const VELOCITY_LIMIT = STEPS_PER_TURN / (1 / 2); // 1 turn / s | max 6.25
const JERK_LIMIT = STEPS_PER_TURN / (16 / 1) * 0;



/*--------------*/

export type TMovement = TNumberArray; // [...distances{axisCount}]
export type TOptimizedMovement = Float64Array; // [id, normalizedAcceleration, normalizedVelocity, ...distances{axisCount}]

/*-------- DEBUG -----------*/

export function FillMovementMaximizationMatrix(
  matrix: TNumberArray,
  rows: number,
  columns: number,
  axisCount: number,
  movementA: TNumberArray,
  movementB: TNumberArray,
  jerkLimitsA: TNumberArray,
  jerkLimitsB: TNumberArray,
  normalizedVelocityLimitA: number,
  normalizedVelocityLimitB: number,
): void {
  // variables: (normalizedVelocityA, normalizedVelocityB)
  // maximize: normalizedVelocityA + normalizedVelocityB

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

    // abs(distanceA * normalizedVelocityA - distanceB * normalizedVelocityB) < jerkLimit
    // => MUST be decomposed in two equations because 'abs' is not supported:

    // (+distanceA * normalizedVelocityA - distanceB * normalizedVelocityB) < jerkLimit
    matrix[row] = distanceA;
    matrix[row + rows] = -distanceB;
    matrix[row + lastColumnIndex] = jerkLimit;
    row++;

    // (-distanceA * normalizedVelocityA + distanceB * normalizedVelocityB) < jerkLimit
    matrix[row] = -distanceA;
    matrix[row + rows] = distanceB;
    matrix[row + lastColumnIndex] = jerkLimit;
    row++;
  }

  // 2.b) set velocity constraints
  // 1 * normalizedVelocityA + 0 * normalizedVelocityB < normalizedVelocityLimitA
  // => normalizedVelocityA < normalizedVelocityLimitA
  matrix[row] = 1;
  matrix[row + rows] = 0;
  matrix[row + lastColumnIndex] = normalizedVelocityLimitA;
  row++;

  // => normalizedVelocityB < normalizedVelocityLimitA
  matrix[row] = 0;
  matrix[row + rows] = 1;
  matrix[row + lastColumnIndex] = normalizedVelocityLimitB;
  row++;

  // 3) set maximize => normalizedVelocityA + normalizedVelocityB
  // note that coefficients are inverted
  matrix[row] = -1;
  matrix[row + rows] = -1;
}


export function testMovementSolution() {

  const axisCount: number = 2;

  const [
    matrix,
    rows,
    columns
  ] = MovementOptimizerCreateMaximizationMatrix<Float64Array>(Float64Array, axisCount);

  const solution: Float64Array = new Float64Array(2);

  const rand = (a: number, b: number) => {
    return Math.random() * (b - a) + a;
  };

  const randValue = () => {
    return rand(-2, 2);
  }

  // const movementA = [randValue(), randValue()];
  // const movementB = [randValue(), randValue()];
  const movementA = [0, 0];
  const movementB = [1, 1];

  FillMovementMaximizationMatrix(
    matrix,
    rows,
    columns,
    axisCount,
    movementA,
    movementB,
    [1, 1],
    [1, 1],
    1000,
    1000,
  );

  const matrixCopy = matrix.slice();

  console.log(
    MatrixToString(
      matrix,
      rows,
      columns,
    )
  );

  SolveAndGetSolutionsOfStandardMaximizationProblemMatrix(
    matrix,
    rows,
    columns,
    solution,
  );

  console.log(
    MatrixToString(
      matrix,
      rows,
      columns,
    )
  );

  console.log(solution);

  VerifyMaximizationProblemMatrixSolutions(
    matrixCopy,
    rows,
    columns,
    solution,
  );



  // console.log(VectorsAngle([1, 0], [0, 1]));
}

/*-------------------*/

export function MovementOptimizerCreateMaximizationMatrix<TMatrix extends TNumberArray>(
  ctor: TArrayLikeTypedConstructor<TMatrix>,
  axisCount: number,
): [TMatrix, number, number] {
  const variableCount: number = 2;
  const constraintCount: number = (axisCount * 2) /* jerk limits */ + 2 /* velocity limits */;
  const rows: number = GetStandardMaximizationProblemMatrixRowCount(constraintCount);
  const columns: number = GetStandardMaximizationProblemMatrixColumnCount(variableCount, constraintCount);
  return [
    new ctor(rows * columns),
    rows,
    columns,
  ];
}


export function DecomposeMovement(
  movementId: number,
  movement: TNumberArray,
  normalizedStartVelocity: number,
  normalizedEndVelocity: number,
  normalizedVelocityLimit: number,
  normalizedAccelerationLimit: number,
  optimizedMovementsList: OptimizedMovementsList,
): void {
  const axisCount: number = movement.length;

  // a decomposed movement have the following phases: acceleration, linear (constant velocity), deceleration

  // 1) compute the point were we accelerate as fast as possible and decelerate as fast as possible

  // ta, tb => time to reach junction peak of full acceleration and deceleration
  // ta for acceleration, tb for deceleration

  const ta: number = (
    Math.sqrt(
      ((normalizedStartVelocity * normalizedStartVelocity) + (normalizedEndVelocity * normalizedEndVelocity)) / 2
      + normalizedAccelerationLimit
    ) - normalizedStartVelocity
  ) / normalizedAccelerationLimit;

  const tb: number = ta + (normalizedStartVelocity - normalizedEndVelocity) / normalizedAccelerationLimit;

  // 2) compute the 3 decomposed movement's times => t0, t1, t2

  // compute acceleration time having a velocity limit
  const t0: number = Math.min(
    ta,
    (normalizedVelocityLimit - normalizedStartVelocity) / normalizedAccelerationLimit /* time to reach velocity limit from normalizedStartVelocity */
  );

  // compute deceleration time having a velocity limit
  const t2: number = Math.min(
    tb,
    (normalizedVelocityLimit - normalizedEndVelocity) / normalizedAccelerationLimit /* time to reach velocity limit from normalizedEndVelocity */
  );

  // compute the max achieved velocity
  const normalizedMaxVelocity: number = normalizedAccelerationLimit * t0 + normalizedStartVelocity;

  // d0, d1, d2 => distances (normalized) of the 3 decomposed children
  const d0: number = (0.5 * normalizedAccelerationLimit * t0 * t0) + (normalizedStartVelocity * t0);
  const d2: number = (0.5 * normalizedAccelerationLimit * t2 * t2) + (normalizedEndVelocity * t2);
  const d1: number = 1 - d0 - d2;

  // console.log('d0', d0, 'd1', d1, 'd2', d2);

  const t1: number = d1 / normalizedMaxVelocity;

  // console.log('t0', t0, 't1', t1, 't2', t2);

  // acceleration
  if (!FloatIsNull(t0)) {
    let index: number = optimizedMovementsList.range.end;
    optimizedMovementsList.range.shiftEnd(optimizedMovementsList.vectorLength);
    optimizedMovementsList.array[index++] = movementId;
    optimizedMovementsList.array[index++] = normalizedAccelerationLimit / d0;
    optimizedMovementsList.array[index++] = normalizedVelocityLimit / d0;
    for (let i: number = 0; i < axisCount; i++) {
      optimizedMovementsList.array[index++] = movement[i] * d0;
    }
  }

  // linear
  if (!FloatIsNull(t1)) {
    let index: number = optimizedMovementsList.range.end;
    optimizedMovementsList.range.shiftEnd(optimizedMovementsList.vectorLength);
    optimizedMovementsList.array[index++] = movementId;
    optimizedMovementsList.array[index++] = 0;
    optimizedMovementsList.array[index++] = normalizedMaxVelocity / d1;
    for (let i: number = 0; i < axisCount; i++) {
      optimizedMovementsList.array[index++] = movement[i] * d1;
    }
  }

  // deceleration
  if (!FloatIsNull(t2)) {
    let index: number = optimizedMovementsList.range.end;
    optimizedMovementsList.range.shiftEnd(optimizedMovementsList.vectorLength);
    optimizedMovementsList.array[index++] = movementId;
    optimizedMovementsList.array[index++] = -normalizedAccelerationLimit / d0;
    optimizedMovementsList.array[index++] = normalizedMaxVelocity / d2;
    for (let i: number = 0; i < axisCount; i++) {
      optimizedMovementsList.array[index++] = movement[i] * d2;
    }
  }
}



/*------------------------------------------------------------*/

// [id, normalizedAcceleration, normalizedVelocity, ...distance[i]{i}]
export const OPTIMIZED_MOVEMENT_ID_OFFSET = 0;
export const OPTIMIZED_MOVEMENT_NORMALIZED_ACCELERATION_OFFSET = 1;
export const OPTIMIZED_MOVEMENT_NORMALIZED_VELOCITY_OFFSET = 2;
export const OPTIMIZED_MOVEMENT_DISTANCE_OFFSET = 3;

export class OptimizedMovementsList extends CyclicTypedVectorArray<Float64Array> {
  public readonly axisCount: number;

  constructor(
    axisCount: number,
    size?: number
  ) {
    const vectorLength: number = 3 + axisCount
    super(
      new Float64Array((size === void 0) ? (vectorLength * 1e6) : size),
      vectorLength
    );
    this.axisCount = axisCount;
  }

  writeMovement(
    id: number,
    normalizedAcceleration: number,
    normalizedVelocity: number,
    movement: TNumberArray,
  ): void {
    let index: number = this.range.end;
    this.range.shiftEnd(this.vectorLength);
    this.array[index++] = id;
    this.array[index++] = normalizedAcceleration;
    this.array[index++] = normalizedVelocity;
    for (let i: number = 0, l = this.axisCount; i < l; i++) {
      this.array[index++] = movement[i];
    }
  }

  printAll(): void {
    for (let i: number = 0, l = this.readable(); i < l; i++) {
      this.print((this.range.start + i) % this.range.size);
    }
  }

  print(index: number, precision: number = 5): void {
    index = index * this.vectorLength;
    const id: number = this.array[index + OPTIMIZED_MOVEMENT_ID_OFFSET];
    const normalizedAcceleration: number = this.array[index + OPTIMIZED_MOVEMENT_NORMALIZED_ACCELERATION_OFFSET];
    const normalizedVelocity: number = this.array[index + OPTIMIZED_MOVEMENT_NORMALIZED_VELOCITY_OFFSET];
    const distances: Float64Array = this.array.subarray(index + OPTIMIZED_MOVEMENT_DISTANCE_OFFSET, index + OPTIMIZED_MOVEMENT_DISTANCE_OFFSET + this.axisCount);

    const numberToString = (value: number) => {
      return FloatToString(value, precision);
    }

    const arrayToString = (values: Float64Array) => {
      return Array.from(values, _ => FloatToString(_, precision)).join(', ');
    }


    console.log(`optimized movement:
      id: ${ id }
      normalizedAcceleration: ${ numberToString(normalizedAcceleration) }
      normalizedVelocity: ${ numberToString(normalizedVelocity) }
      distances: [${ arrayToString(distances) }]
    `);
  }
}


/*------------*/


export function ConstrainedMovementsListFillMovementMaximizationMatrix(
  constrainedMovementsList: ConstrainedMovementsList,
  matrix: TNumberArray,
  rows: number,
  columns: number,
  movementIndexA: number,
  movementIndexB: number,
  normalizedVelocityLimitA: number,
  normalizedVelocityLimitB: number,
): void {
  const axisCount: number = constrainedMovementsList.axisCount;

  // variables: (normalizedVelocityA, normalizedVelocityB)
  // maximize: normalizedVelocityA + normalizedVelocityB

  // 1) set slack variables
  SetUpStandardMaximizationProblemMatrixSlackVariables(matrix, rows, columns);

  // 2) set constraints
  const lastColumnIndex: number = (columns - 1) * rows;
  let row: number = 0;

  // 2.a) set jerk constraints
  for (let i: number = 0; i < axisCount; i++) { // for each axis
    const distanceA: number = constrainedMovementsList.distances[movementIndexA + i];
    const distanceB: number = constrainedMovementsList.distances[movementIndexB + i];
    const jerkLimit: number = Math.min(
      constrainedMovementsList.jerkLimits[movementIndexA + i],
      constrainedMovementsList.jerkLimits[movementIndexB + i],
    );

    // abs(distanceA * normalizedVelocityA - distanceB * normalizedVelocityB) < jerkLimit
    // => MUST be decomposed in two equations because 'abs' is not supported:

    // (+distanceA * normalizedVelocityA - distanceB * normalizedVelocityB) < jerkLimit
    matrix[row] = distanceA;
    matrix[row + rows] = -distanceB;
    matrix[row + lastColumnIndex] = jerkLimit;
    row++;

    // (-distanceA * normalizedVelocityA + distanceB * normalizedVelocityB) < jerkLimit
    matrix[row] = -distanceA;
    matrix[row + rows] = distanceB;
    matrix[row + lastColumnIndex] = jerkLimit;
    row++;
  }

  // 2.b) set velocity constraints
  // 1 * normalizedVelocityA + 0 * normalizedVelocityB < normalizedVelocityLimitA
  // => normalizedVelocityA < normalizedVelocityLimitA
  matrix[row] = 1;
  matrix[row + rows] = 0;
  matrix[row + lastColumnIndex] = normalizedVelocityLimitA;
  row++;

  // => normalizedVelocityB < normalizedVelocityLimitA
  matrix[row] = 0;
  matrix[row + rows] = 1;
  matrix[row + lastColumnIndex] = normalizedVelocityLimitB;
  row++;

  // 3) set maximize => normalizedVelocityA + normalizedVelocityB
  // note that coefficients are inverted
  matrix[row] = -1;
  matrix[row + rows] = -1;
}

export function ConstrainedMovementsListFillAndSolveMovementMaximizationMatrix<TOutput extends TNumberArray>(
  constrainedMovementsList: ConstrainedMovementsList,
  matrix: TNumberArray,
  rows: number,
  columns: number,
  movementIndexA: number,
  movementIndexB: number,
  normalizedVelocityLimitA: number,
  normalizedVelocityLimitB: number,
  output: TOutput,
): TOutput {
  ConstrainedMovementsListFillMovementMaximizationMatrix(
    constrainedMovementsList,
    matrix,
    rows,
    columns,
    movementIndexA,
    movementIndexB,
    normalizedVelocityLimitA,
    normalizedVelocityLimitB,
  );

  return SolveAndGetSolutionsOfStandardMaximizationProblemMatrix(
    matrix,
    rows,
    columns,
    output,
  );
}

export function ConstrainedMovementsListDecomposeMovementToOptimizedMovementsList(
  constrainedMovementsList: ConstrainedMovementsList,
  movementIndex: number,
  optimizedMovementsList: OptimizedMovementsList,
): void {
  return DecomposeMovement(
    constrainedMovementsList.ids[movementIndex],
    constrainedMovementsList.distances.subarray(movementIndex, movementIndex + constrainedMovementsList.axisCount),
    constrainedMovementsList.normalizedStartVelocitiesBToA[movementIndex],
    constrainedMovementsList.normalizedEndVelocitiesBToA[movementIndex],
    constrainedMovementsList.normalizedVelocityLimits[movementIndex],
    constrainedMovementsList.normalizedAccelerationLimits[movementIndex],
    optimizedMovementsList,
  );
}

export class ConstrainedMovementsList {
  public readonly axisCount: number;
  public readonly ids: Uint32Array;
  public readonly distances: Float64Array;
  public readonly normalizedAccelerationLimits: Float64Array;
  public readonly normalizedVelocityLimits: Float64Array;
  public readonly jerkLimits: Float64Array;
  public readonly normalizedStartVelocitiesAToB: Float64Array;
  public readonly normalizedEndVelocitiesAToB: Float64Array;
  public readonly normalizedStartVelocitiesBToA: Float64Array;
  public readonly normalizedEndVelocitiesBToA: Float64Array;

  public readonly range: CyclicRange;

  constructor(
    axisCount: number,
    size: number
  ) {
    this.axisCount = axisCount;
    this.ids = new Uint32Array(size);
    this.distances = new Float64Array(size * axisCount);
    this.normalizedAccelerationLimits = new Float64Array(size);
    this.normalizedVelocityLimits = new Float64Array(size);
    this.jerkLimits = new Float64Array(size * axisCount);
    this.normalizedStartVelocitiesAToB = new Float64Array(size);
    this.normalizedEndVelocitiesAToB = new Float64Array(size);
    this.normalizedStartVelocitiesBToA = new Float64Array(size);
    this.normalizedEndVelocitiesBToA = new Float64Array(size);
    // this.distances = Array.from({ length: axisCount }, () => new Float64Array(size));
    // this.jerkLimits = Array.from({ length: axisCount }, () => new Float64Array(size));
    this.range = new CyclicRange(size);
  }

  write(
    movementId: number,
    distances: TNumberArray,
    normalizedAccelerationLimit: number,
    normalizedVelocityLimit: number,
    jerkLimits: TNumberArray,
    normalizedStartVelocityAToB: number,
    normalizedEndVelocityAToB: number,
    normalizedStartVelocityBToA: number,
    normalizedEndVelocityBToA: number,
  ): number {
    const axisCount: number = this.axisCount;
    const index: number = this.range.end;
    this.range.shiftEnd(1);

    this.ids[index] = movementId;

    this.normalizedAccelerationLimits[index] = normalizedAccelerationLimit;
    this.normalizedVelocityLimits[index] = normalizedVelocityLimit;

    this.normalizedStartVelocitiesAToB[index] = normalizedStartVelocityAToB;
    this.normalizedEndVelocitiesAToB[index] = normalizedEndVelocityAToB;
    this.normalizedStartVelocitiesBToA[index] = normalizedStartVelocityBToA;
    this.normalizedEndVelocitiesBToA[index] = normalizedEndVelocityBToA;

    for (let i: number = 0, j: number = index * axisCount; i < axisCount; i++, j++) {
      this.distances[j] = distances[i];
      this.jerkLimits[j] = jerkLimits[i];
    }

    return index;
  }

  printAll(): void {
    for (let i: number = 0, l = this.range.startToEnd(); i < l; i++) {
      this.print((this.range.start + i) % this.range.size);
    }
  }

  print(index: number, precision: number = 5): void {
    const a: number = index * this.axisCount;
    const b: number = a + this.axisCount;

    const id: number = this.ids[index];
    const distances: Float64Array = this.distances.subarray(a, b);
    const normalizedAccelerationLimit: number = this.normalizedAccelerationLimits[index];
    const normalizedVelocityLimit: number = this.normalizedVelocityLimits[index];
    const jerkLimits: Float64Array = this.jerkLimits.subarray(a, b);

    const normalizedStartVelocityAToB: number = this.normalizedStartVelocitiesAToB[index];
    const normalizedEndVelocityAToB: number = this.normalizedEndVelocitiesAToB[index];
    const normalizedStartVelocityBToA: number = this.normalizedStartVelocitiesBToA[index];
    const normalizedEndVelocityBToA: number = this.normalizedEndVelocitiesBToA[index];

    const startVelocitiesAToB: Float64Array = distances.map((distance: number) => distance * normalizedStartVelocityAToB);
    const endVelocitiesAToB: Float64Array = distances.map((distance: number) => distance * normalizedEndVelocityAToB);
    const startVelocitiesBToA: Float64Array = distances.map((distance: number) => distance * normalizedStartVelocityBToA);
    const endVelocitiesBToA: Float64Array = distances.map((distance: number) => distance * normalizedEndVelocityBToA);

    const numberToString = (value: number) => {
      return FloatToString(value, precision);
    }

    const arrayToString = (values: Float64Array) => {
      return Array.from(values, _ => FloatToString(_, precision)).join(', ');
    }

    console.log(`constrained movement:
      id: ${ id }
      distances: [${ arrayToString(distances) }]
      normalizedAccelerationLimit: ${ numberToString(normalizedAccelerationLimit) }
      normalizedVelocityLimit: ${ numberToString(normalizedVelocityLimit) }
      jerkLimits: [${ arrayToString(jerkLimits) }]
      
      startVelocityAToB: ${ numberToString(normalizedStartVelocityAToB) } [${ arrayToString(startVelocitiesAToB) }]
      endVelocityAToB: ${ numberToString(normalizedEndVelocityAToB) } [${ arrayToString(endVelocitiesAToB) }]
      startVelocityBToA: ${ numberToString(normalizedStartVelocityBToA) } [${ arrayToString(startVelocitiesBToA) }]
      endVelocityBToA: ${ numberToString(normalizedEndVelocityBToA) } [${ arrayToString(endVelocitiesBToA) }]
    `);

    // distances: [${ this.distances.map((distances: Float64Array) => FloatToString(distances[index], precision)).join(', ') }]
    // jerkLimits: [${ this.jerkLimits.map((jerkLimits: Float64Array) => FloatToString(jerkLimits[index], precision)).join(', ') }]
  }
}


/*---*/


export interface IMovementOptimizer {
  readonly axisCount: number;
  readonly constraints: IMovementConstraint[];
}

// console.log(
//   MatrixToString(
//     this.maximizationMatrix,
//     this.maximizationMatrixRows,
//     this.maximizationMatrixColumns,
//   )
// );
//
// console.log(this.maximizationMatrixSolution);



export function MovementOptimizerFillAndSolveMaximizationMatrix(
  instance: MovementOptimizer,
  movementIndexA: number,
  movementIndexB: number,
  normalizedVelocityLimitA: number,
  normalizedVelocityLimitB: number,
): void {
  const privates: MovementOptimizer = instance;
  ConstrainedMovementsListFillAndSolveMovementMaximizationMatrix(
    privates.movements,
    privates.maximizationMatrix,
    privates.maximizationMatrixRows,
    privates.maximizationMatrixColumns,
    movementIndexA,
    movementIndexB,
    normalizedVelocityLimitA,
    normalizedVelocityLimitB,
    privates.maximizationMatrixSolution,
  );
}

export function MovementOptimizerDecomposeMovement(
  instance: MovementOptimizer,
  movementIndex: number,
): void {
  const privates: MovementOptimizer = instance;
  ConstrainedMovementsListDecomposeMovementToOptimizedMovementsList(
    privates.movements,
    movementIndex,
    privates.optimizedMovements,
  );
}

export function MovementOptimizerAddMovement(
  instance: MovementOptimizer,
  movement: TMovement,
  constraints: IMovementConstraint[] = instance.constraints
): number {
  const privates: MovementOptimizer = instance;

  console.warn('---> add movement');

  const movementId: number = privates.movementId++;
  const axisCount: number = privates.axisCount;

  /* first, compute normalized acceleration and velocity limits */
  let normalizedAccelerationLimit: number = Number.POSITIVE_INFINITY;
  let normalizedVelocityLimit: number = Number.POSITIVE_INFINITY;

  for (let i: number = 0; i < axisCount; i++) {
    const distance: number = movement[i];
    if (distance !== 0) {
      const constraint: IMovementConstraint = constraints[i];
      const absoluteDistance: number = Math.abs(distance);
      normalizedAccelerationLimit = Math.min(normalizedAccelerationLimit, constraint.accelerationLimit / absoluteDistance);
      normalizedVelocityLimit = Math.min(normalizedVelocityLimit, constraint.velocityLimit / absoluteDistance);
    }
  }

  console.log(
    'normalizedAccelerationLimit', normalizedAccelerationLimit,
    'normalizedVelocityLimit', normalizedVelocityLimit,
  );

  const movementsCount: number = privates.movements.range.startToEnd();
  const lastMovementIndex: number = (movementsCount === 0)
    ? -1
    : (privates.movements.range.end - 1 + privates.movements.range.size) % privates.movements.range.size;

  const movementJerkLimits: TNumberArray = constraints.map(constraint => constraint.jerkLimit);

  const currentMovementIndex: number = privates.movements.write(
    movementId,
    movement,
    normalizedAccelerationLimit,
    normalizedVelocityLimit,
    movementJerkLimits,
    0,
    0,
    0,
    0,
  );

  // if there is no previous movement
  if (lastMovementIndex === -1) {
    privates.movements.normalizedEndVelocitiesAToB[currentMovementIndex] = Math.min( // normalizedEndVelocityAToB
      normalizedVelocityLimit,
      Math.sqrt(2 * normalizedAccelerationLimit), // max reachable velocity at max acceleration
    );

    MovementOptimizerDecomposeMovement(instance, currentMovementIndex);
  } else { // if there is a previous movement

    /* compute maximum transition velocities from A to B */

    MovementOptimizerFillAndSolveMaximizationMatrix(
      instance,
      lastMovementIndex,
      currentMovementIndex,
      privates.movements.normalizedEndVelocitiesAToB[lastMovementIndex],
      normalizedVelocityLimit,
    );

    privates.movements.normalizedEndVelocitiesAToB[lastMovementIndex] = privates.maximizationMatrixSolution[0];

    const normalizedStartVelocityAToB: number = privates.maximizationMatrixSolution[1];
    privates.movements.normalizedStartVelocitiesAToB[currentMovementIndex] = normalizedStartVelocityAToB;
    privates.movements.normalizedEndVelocitiesAToB[currentMovementIndex] = Math.min(
      normalizedVelocityLimit,
      Math.sqrt(normalizedStartVelocityAToB * normalizedStartVelocityAToB + 2 * normalizedAccelerationLimit) // max reachable velocity at max acceleration
    );

    /* compute maximum transition velocities from B to A */

    for (let i: number = 0; i < movementsCount; i++) {
      const indexA: number = (privates.movements.range.end - (i + 2) + privates.movements.range.size) % privates.movements.range.size;
      const indexB: number = (privates.movements.range.end - (i + 1) + privates.movements.range.size) % privates.movements.range.size;

      const normalizedEndVelocityBToA = privates.movements.normalizedEndVelocitiesBToA[indexB];
      const normalizedStartVelocityBToA = Math.min(
        privates.movements.normalizedVelocityLimits[indexB],
        Math.sqrt(normalizedEndVelocityBToA * normalizedEndVelocityBToA + 2 *  privates.movements.normalizedAccelerationLimits[indexB]) // max reachable velocity at max acceleration
      );

      const normalizedStartVelocityAToBOfB: number = privates.movements.normalizedStartVelocitiesAToB[indexB];

      if (normalizedStartVelocityBToA >= normalizedStartVelocityAToBOfB) {
        console.log('movement already optimized');
        privates.movements.normalizedStartVelocitiesBToA[indexB] = normalizedStartVelocityAToBOfB;
        privates.movements.range.shiftStart(movementsCount);
        MovementOptimizerDecomposeMovement(instance, currentMovementIndex);
      } else {
        const vectorStartA: number = indexA * axisCount;
        const vectorEndA: number = vectorStartA + axisCount;
        const movementA: Float64Array = privates.movements.distances.subarray(vectorStartA, vectorEndA);
        const jerkLimitsA: Float64Array = privates.movements.jerkLimits.subarray(vectorStartA, vectorEndA);

        const vectorStartB: number = indexB * axisCount;
        const vectorEndB: number = vectorStartB + axisCount;
        const movementB: Float64Array = privates.movements.distances.subarray(vectorStartB, vectorEndB);
        const jerkLimitsB: Float64Array = privates.movements.jerkLimits.subarray(vectorStartB, vectorEndB);


        FillMovementMaximizationMatrix(
          privates.maximizationMatrix,
          privates.maximizationMatrixRows,
          privates.maximizationMatrixColumns,
          axisCount,
          movementA,
          movementB,
          jerkLimitsA,
          jerkLimitsB,
          privates.movements.normalizedEndVelocitiesAToB[indexA],
          normalizedStartVelocityBToA,
        );

        SolveAndGetSolutionsOfStandardMaximizationProblemMatrix(
          privates.maximizationMatrix,
          privates.maximizationMatrixRows,
          privates.maximizationMatrixColumns,
          privates.maximizationMatrixSolution,
        );

        // console.log(privates.maximizationMatrixSolution);

        privates.movements.normalizedEndVelocitiesBToA[indexA] = privates.maximizationMatrixSolution[0];
        privates.movements.normalizedStartVelocitiesBToA[indexB] = privates.maximizationMatrixSolution[1];
      }
    }
  }




  // privates.movements.print((privates.movements.range.end - 1 + privates.movements.range.size) % privates.movements.range.size);
  privates.movements.printAll();


  // movement: TNumberArray,
  //   normalizedStartVelocity: number,
  //   normalizedEndVelocity: number,
  //   normalizedVelocityLimit: number,
  //   normalizedAccelerationLimit: number,
  //   movementList: OptimizedMovementList,

  // DecomposeMovement(
  //   0,
  //   movement,
  //   0,
  //   0,
  //   1,
  //   1,
  //   privates.optimizedMovements,
  // );



  return movementId;
}


export interface IMovementConstraint {
  accelerationLimit: number;
  velocityLimit: number;
  jerkLimit: number;
}

export class MovementOptimizer implements IMovementOptimizer {
  public readonly axisCount: number;
  public readonly constraints: IMovementConstraint[];

  public movementId: number;
  public readonly optimizedMovements: OptimizedMovementsList;

  public readonly movements: ConstrainedMovementsList;

  public readonly maximizationMatrix: Float64Array;
  public readonly maximizationMatrixRows: number;
  public readonly maximizationMatrixColumns: number;
  public readonly maximizationMatrixSolution: Float64Array;

  constructor(
    constraints: IMovementConstraint[]
  ) {
    this.axisCount = constraints.length;
    // if (constraints.length !== this.axisCount) {
    //   throw new Error(`constraints' length must be ${ this.axisCount }`)
    // }
    this.constraints = constraints;

    this.movementId = 0;
    this.movements = new ConstrainedMovementsList(this.axisCount, 1e6);
    this.optimizedMovements = new OptimizedMovementsList(this.axisCount);
    [
      this.maximizationMatrix,
      this.maximizationMatrixRows,
      this.maximizationMatrixColumns
    ] = MovementOptimizerCreateMaximizationMatrix<Float64Array>(Float64Array, this.axisCount);
    this.maximizationMatrixSolution = new Float64Array(2);

    // this.normalizedAccelerationLimits = [];
    // this.normalizedVelocityLimits = [];
  }

  get pendingOptimizedMovements(): number {
    return this.optimizedMovements.readable();
  }

  /**
   * Adds a movement to optimize
   *   movement => [X, Y, Z, etc...]
   */
  add(
    movement: TMovement,
    constraints?: IMovementConstraint[]
  ): number {
    return MovementOptimizerAddMovement(this, movement, constraints);
  }

  // returns an optimized movement
  pop(output?: TOptimizedMovement): TOptimizedMovement {
    return this.optimizedMovements.pop(output);
  }
}

// private _optimizeTransitionSpeedsPass2(normalizedMovesSequence: ConstrainedNormalizedMovementSequence) {
//   let finalSpeed: number;
//   let accelerationLimit: number;
//   let initialSpeedLimit: number;
//
//   let matrix: Matrix;
//   let solutions: Matrix;
//
//   let i: number = normalizedMovesSequence.length - 1;
//   normalizedMovesSequence._buffers['finalSpeeds'][i] = 0;
//
//   for (; i > 0; i--) {
//     finalSpeed = normalizedMovesSequence._buffers['finalSpeeds'][i];
//     accelerationLimit = normalizedMovesSequence._buffers['accelerationLimits'][i];
//
//     // compute initial speed limit according to accelerationLimit and speedLimit
//     initialSpeedLimit = Math.min(
//       normalizedMovesSequence._buffers['speedLimits'][i],
//       normalizedMovesSequence._buffers['initialSpeeds'][i],
//       (accelerationLimit === 0) ?
//         finalSpeed : Math.sqrt(finalSpeed * finalSpeed + 2 * accelerationLimit)
//     );
//
//     // build the maximization matrix
//     matrix = this._getMaximizationMatrix(
//       i - 1, i,
//       Math.min(initialSpeedLimit, normalizedMovesSequence._buffers['finalSpeeds'][i - 1]), initialSpeedLimit,
//     );
//     // get max final and initial speeds
//     solutions = matrix.solveStandardMaximizationProblem(matrix).getStandardMaximizationProblemSolutions();
//
//     normalizedMovesSequence._buffers['finalSpeeds'][i - 1] = solutions.values[0];
//     normalizedMovesSequence._buffers['initialSpeeds'][i] = solutions.values[1];
//   }
// }


export function debugMovementOptimizer() {
  const defaultConstraint: IMovementConstraint = {
    accelerationLimit: 1,
    velocityLimit: 1,
    jerkLimit: 0.1,
  };

  const constraints: IMovementConstraint[] = [
    defaultConstraint,
    defaultConstraint,
  ];

  const optimizer = new MovementOptimizer(constraints);

  optimizer.add([1, 2]);
  optimizer.optimizedMovements.printAll();
  optimizer.add([2, -1]);
  optimizer.add([2, -1], [
    defaultConstraint,
    {
      ...defaultConstraint,
      accelerationLimit: 0.001
    },
  ]);
  optimizer.optimizedMovements.printAll();

  // optimizer.add([0, 2]);
  // optimizer.add([2, 0]);

  // console.log(optimizer.movements.array);
  // console.log(optimizer.movements.toTypedArray());
}


export function runDebug() {
  // debugStandardMaximizationProblem();
  // debugStandardMaximizationProblemSolver();
  debugMovementOptimizer();
  // debugCyclicIndex();
  // debugCyclicRange();
  // testMovementSolution();

}
