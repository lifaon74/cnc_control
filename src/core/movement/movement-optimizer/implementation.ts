import { TArrayLikeTypedConstructor, TNumberArray } from '../../helpers/types';
import {
  GetStandardMaximizationProblemMatrixColumnCount, GetStandardMaximizationProblemMatrixRowCount
} from '../../helpers/standard-maximization-problem';
import { IMovementOptimizer } from './interfaces';
import {
  OPTIMIZED_MOVEMENT_ID_OFFSET, OptimizedMovementListSearchEndShiftById, OptimizedMovementsList
} from '../optimized-movements-list/implementation';
import {
  ConstrainedMovementListSearchStartShiftById, ConstrainedMovementsList,
  ConstrainedMovementsListDecomposeMovementToOptimizedMovementsList,
  ConstrainedMovementsListFillAndSolveMovementMaximizationMatrix
} from '../constrained-movements-list/implementation';
import { TMovement, TOptimizedMovement } from '../types';
import { FloatIsNull } from '../../helpers/math';

/** FUNCTIONS **/

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
    optimizedMovementsList.array[index++] = t0;
    optimizedMovementsList.array[index++] = normalizedAccelerationLimit / d0;
    optimizedMovementsList.array[index++] = normalizedStartVelocity / d0;
    for (let i: number = 0; i < axisCount; i++) {
      optimizedMovementsList.array[index++] = movement[i] * d0;
    }
  }

  // linear
  if (!FloatIsNull(t1)) {
    let index: number = optimizedMovementsList.range.end;
    optimizedMovementsList.range.shiftEnd(optimizedMovementsList.vectorLength);
    optimizedMovementsList.array[index++] = movementId;
    optimizedMovementsList.array[index++] = t1;
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
    optimizedMovementsList.array[index++] = t2;
    optimizedMovementsList.array[index++] = -normalizedAccelerationLimit / d2;
    optimizedMovementsList.array[index++] = normalizedMaxVelocity / d2;
    for (let i: number = 0; i < axisCount; i++) {
      optimizedMovementsList.array[index++] = movement[i] * d2;
    }
  }
}

export function MovementOptimizerFillAndSolveMaximizationMatrix(
  instance: MovementOptimizer,
  movementIndexA: number,
  movementIndexB: number,
  normalizedVelocityLimitA: number,
  normalizedVelocityLimitB: number,
): void {
  const privates: MovementOptimizer = instance;
  ConstrainedMovementsListFillAndSolveMovementMaximizationMatrix(
    privates.constrainedMovements,
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
    privates.constrainedMovements,
    movementIndex,
    privates.optimizedMovements,
  );
}

export function MovementOptimizerWriteConstrainedMovement(
  instance: MovementOptimizer,
  movement: TMovement,
  accelerationLimits: Float64Array = instance.accelerationLimits,
  velocityLimits: Float64Array = instance.velocityLimits,
  jerkLimits: Float64Array = instance.jerkLimits,
): number {
  const privates: MovementOptimizer = instance;

  // console.warn('---> add movement');

  const movementId: number = privates.movementId++;
  const axisCount: number = privates.axisCount;

  /* first, compute normalized acceleration and velocity limits */
  let normalizedAccelerationLimit: number = Number.POSITIVE_INFINITY;
  let normalizedVelocityLimit: number = Number.POSITIVE_INFINITY;

  for (let i: number = 0; i < axisCount; i++) {
    const distance: number = movement[i];
    if (distance !== 0) {
      const absoluteDistance: number = Math.abs(distance);
      normalizedAccelerationLimit = Math.min(normalizedAccelerationLimit, accelerationLimits[i] / absoluteDistance);
      normalizedVelocityLimit = Math.min(normalizedVelocityLimit, velocityLimits[i] / absoluteDistance);
    }
  }

  // console.log(
  //   'normalizedAccelerationLimit', normalizedAccelerationLimit,
  //   'normalizedVelocityLimit', normalizedVelocityLimit,
  // );

  const constrainedMovementsCount: number = privates.constrainedMovements.range.startToEnd();
  const previousMovementIndex: number = (constrainedMovementsCount === 0)
    ? -1
    : (privates.constrainedMovements.range.end - 1 + privates.constrainedMovements.range.size) % privates.constrainedMovements.range.size;

  const currentMovementIndex: number = privates.constrainedMovements.write(
    movementId,
    movement,
    normalizedAccelerationLimit,
    normalizedVelocityLimit,
    jerkLimits,
    0,
    0,
    0,
    0,
  );

  if (previousMovementIndex === -1) { // if there is no previous movement
    // A -> B : set end velocity for the current movement (normalizedEndVelocityAToB)
    privates.constrainedMovements.normalizedEndVelocitiesAToB[currentMovementIndex] = Math.min(
      normalizedVelocityLimit,
      Math.sqrt(2 * normalizedAccelerationLimit), // max reachable velocity at max acceleration
    );

    // split the movement and store it into our optimized movements list
    MovementOptimizerDecomposeMovement(instance, currentMovementIndex);
  } else { // if there is a previous movement

    /* PASS 1 : A -> B */

    // A -> B : compute maximum transition velocities
    MovementOptimizerFillAndSolveMaximizationMatrix(
      instance,
      previousMovementIndex,
      currentMovementIndex,
      privates.constrainedMovements.normalizedEndVelocitiesAToB[previousMovementIndex],
      normalizedVelocityLimit,
    );

    // A -> B : set end velocity for the previous movement
    privates.constrainedMovements.normalizedEndVelocitiesAToB[previousMovementIndex] = privates.maximizationMatrixSolution[0];

    const normalizedStartVelocityAToB: number = privates.maximizationMatrixSolution[1];

    // A -> B : set start velocity for our current movement
    privates.constrainedMovements.normalizedStartVelocitiesAToB[currentMovementIndex] = normalizedStartVelocityAToB;

    // A -> B : set end velocity for our current movement
    privates.constrainedMovements.normalizedEndVelocitiesAToB[currentMovementIndex] = Math.min(
      normalizedVelocityLimit,
      Math.sqrt(normalizedStartVelocityAToB * normalizedStartVelocityAToB + 2 * normalizedAccelerationLimit) // max reachable velocity at max acceleration
    );

    /* PASS 2 : B -> A */
    let i: number = 0;
    const offsetA: number = (privates.constrainedMovements.range.end - 2 + privates.constrainedMovements.range.size);
    const offsetB: number = offsetA + 1;
    for (; i < constrainedMovementsCount; i++) {
      // const indexA: number = (privates.constrainedMovements.range.end - (i + 2) + privates.constrainedMovements.range.size) % privates.constrainedMovements.range.size;
      // const indexB: number = (privates.constrainedMovements.range.end - (i + 1) + privates.constrainedMovements.range.size) % privates.constrainedMovements.range.size;
      const indexA: number = (offsetA - i) % privates.constrainedMovements.range.size;
      const indexB: number = (offsetB - i) % privates.constrainedMovements.range.size;

      const normalizedStartVelocityAToBOfB: number = privates.constrainedMovements.normalizedStartVelocitiesAToB[indexB];
      const normalizedEndVelocityBToAOfB: number = privates.constrainedMovements.normalizedEndVelocitiesBToA[indexB];

      // B -> A : compute max reachable start velocity of the B movement
      const normalizedStartVelocityBToA: number = Math.min(
        privates.constrainedMovements.normalizedVelocityLimits[indexB],
        Math.sqrt(normalizedEndVelocityBToAOfB * normalizedEndVelocityBToAOfB + 2 * privates.constrainedMovements.normalizedAccelerationLimits[indexB]) // max reachable velocity at max acceleration
      );

      // IF the max reachable start velocity of B is greater than our best A -> B start velocity,
      // the movement A is already in its most optimized form
      if (normalizedStartVelocityBToA >= normalizedStartVelocityAToBOfB) {
        // console.info('movement already optimized');

        // B -> A : set start velocity for movement B (same as A -> B start velocity of B)
        privates.constrainedMovements.normalizedStartVelocitiesBToA[indexB] = normalizedStartVelocityAToBOfB;
        break;
      } else {
        // console.info('movement not optimized');
        // console.log(normalizedStartVelocityBToA, normalizedStartVelocityAToBOfB);

        // const vectorStartA: number = indexA * axisCount;
        // const vectorEndA: number = vectorStartA + axisCount;
        // const movementA: Float64Array = privates.movements.distances.subarray(vectorStartA, vectorEndA);
        // const jerkLimitsA: Float64Array = privates.movements.jerkLimits.subarray(vectorStartA, vectorEndA);
        //
        // const vectorStartB: number = indexB * axisCount;
        // const vectorEndB: number = vectorStartB + axisCount;
        // const movementB: Float64Array = privates.movements.distances.subarray(vectorStartB, vectorEndB);
        // const jerkLimitsB: Float64Array = privates.movements.jerkLimits.subarray(vectorStartB, vectorEndB);
        //
        // FillMovementMaximizationMatrix(
        //   privates.maximizationMatrix,
        //   privates.maximizationMatrixRows,
        //   privates.maximizationMatrixColumns,
        //   axisCount,
        //   movementA,
        //   movementB,
        //   jerkLimitsA,
        //   jerkLimitsB,
        //   privates.movements.normalizedEndVelocitiesAToB[indexA],
        //   normalizedStartVelocityBToA,
        // );
        //
        // SolveAndGetSolutionsOfStandardMaximizationProblemMatrix(
        //   privates.maximizationMatrix,
        //   privates.maximizationMatrixRows,
        //   privates.maximizationMatrixColumns,
        //   privates.maximizationMatrixSolution,
        // );

        // B -> A : compute maximum transition velocities
        MovementOptimizerFillAndSolveMaximizationMatrix(
          instance,
          indexA,
          indexB,
          privates.constrainedMovements.normalizedEndVelocitiesAToB[indexA],
          normalizedStartVelocityBToA,
        );

        // B -> A : set end velocity for movement A
        privates.constrainedMovements.normalizedEndVelocitiesBToA[indexA] = privates.maximizationMatrixSolution[0];

        // B -> A : set start velocity for movement B
        privates.constrainedMovements.normalizedStartVelocitiesBToA[indexB] = privates.maximizationMatrixSolution[1];
      }
    }

    // (1) removes unnecessary constrained movements (already optimized at their best)
    privates.constrainedMovements.range.shiftStart(constrainedMovementsCount - i);

    // get first invalid optimized movement (must be re-optimized and decomposed)
    const optimizedMovementEndShift: number = OptimizedMovementListSearchEndShiftById(
      privates.optimizedMovements,
      privates.constrainedMovements.ids[privates.constrainedMovements.range.start]
    );

    // console.log('optimizedMovementOffset', optimizedMovementOffset);

    // remove optimizedMovements that must be re-optimized
    if (optimizedMovementEndShift !== -1) { // -1 may append if constrainedMovements are already optimized at best => see (1)
      privates.optimizedMovements.range.shiftEnd(-optimizedMovementEndShift);
    }

    // decompose constrained movements
    for (let j: number = 0, l = privates.constrainedMovements.range.startToEnd(); j < l; j++) {
      const index: number = (privates.constrainedMovements.range.start + j) % privates.constrainedMovements.range.size;
      MovementOptimizerDecomposeMovement(instance, index);
    }
  }


  // privates.movements.print((privates.movements.range.end - 1 + privates.movements.range.size) % privates.movements.range.size);
  // privates.constrainedMovements.printAll();

  return movementId;
}

export function MovementOptimizerReadOptimizedMovement(
  instance: MovementOptimizer,
  output?: TOptimizedMovement
): TOptimizedMovement {
  const privates: MovementOptimizer = instance;
  const optimizedMovement: TOptimizedMovement = privates.optimizedMovements.shift(output);

  // get first optimizable constrained movement
  const constrainedMovementStartShift: number = ConstrainedMovementListSearchStartShiftById(
    privates.constrainedMovements,
    optimizedMovement[OPTIMIZED_MOVEMENT_ID_OFFSET]
  );

  // remove constrainedMovements that cannot be optimized any more
  if (constrainedMovementStartShift !== -1) {
    privates.constrainedMovements.range.shiftStart(constrainedMovementStartShift);
  }

  return optimizedMovement;
}

// export interface IMovementConstraint {
//   accelerationLimit: number;
//   velocityLimit: number;
//   jerkLimit: number;
// }

/** CLASS **/

export class MovementOptimizer implements IMovementOptimizer {
  public readonly axisCount: number;
  public readonly accelerationLimits: Float64Array;
  public readonly velocityLimits: Float64Array;
  public readonly jerkLimits: Float64Array;

  public movementId: number;
  public readonly optimizedMovements: OptimizedMovementsList;

  public readonly constrainedMovements: ConstrainedMovementsList;

  public readonly maximizationMatrix: Float64Array;
  public readonly maximizationMatrixRows: number;
  public readonly maximizationMatrixColumns: number;
  public readonly maximizationMatrixSolution: Float64Array;

  constructor(
    axisCount: number,
    accelerationLimits: Float64Array,
    velocityLimits: Float64Array,
    jerkLimits: Float64Array,
  ) {
    this.axisCount = axisCount;
    this.accelerationLimits = accelerationLimits;
    this.velocityLimits = velocityLimits;
    this.jerkLimits = jerkLimits;

    this.movementId = 0;
    this.constrainedMovements = new ConstrainedMovementsList(this.axisCount, 1e6);
    this.optimizedMovements = new OptimizedMovementsList(this.axisCount);
    [
      this.maximizationMatrix,
      this.maximizationMatrixRows,
      this.maximizationMatrixColumns
    ] = MovementOptimizerCreateMaximizationMatrix<Float64Array>(Float64Array, this.axisCount);
    this.maximizationMatrixSolution = new Float64Array(2);
  }

  get pendingOptimizedMovements(): number {
    return this.optimizedMovements.readable();
  }

  /**
   * Adds a movement to optimize
   *   movement => [X, Y, Z, etc...]
   */
  write(
    movement: TMovement,
    accelerationLimits?: Float64Array,
    velocityLimits?: Float64Array,
    jerkLimits?: Float64Array,
  ): number {
    return MovementOptimizerWriteConstrainedMovement(
      this,
      movement,
      accelerationLimits,
      velocityLimits,
      jerkLimits,
    );
  }

  // returns an optimized movement
  read(output?: TOptimizedMovement): TOptimizedMovement {
    return MovementOptimizerReadOptimizedMovement(this, output);
  }
}

