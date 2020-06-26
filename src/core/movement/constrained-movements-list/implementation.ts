import { CyclicRange } from '../../classes/cyclic/CyclicRange';
import { TNumberArray } from '../../helpers/types';
import { FloatToString } from '../../helpers/math';
import { OptimizedMovementsList } from '../optimized-movements-list/implementation';
import {
  SetUpStandardMaximizationProblemMatrixSlackVariables, SolveAndGetSolutionsOfStandardMaximizationProblemMatrix
} from '../../helpers/standard-maximization-problem';
import { DecomposeMovement } from '../movement-optimizer/implementation';

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
  const distancesIndex: number = movementIndex * constrainedMovementsList.axisCount;
  return DecomposeMovement(
    constrainedMovementsList.ids[movementIndex],
    constrainedMovementsList.distances.subarray(distancesIndex, distancesIndex + constrainedMovementsList.axisCount),
    constrainedMovementsList.normalizedStartVelocitiesBToA[movementIndex],
    constrainedMovementsList.normalizedEndVelocitiesBToA[movementIndex],
    constrainedMovementsList.normalizedVelocityLimits[movementIndex],
    constrainedMovementsList.normalizedAccelerationLimits[movementIndex],
    optimizedMovementsList,
  );
}

/**
 * Searches from the start of 'constrainedMovementsList' the first constrained movement matching 'id'.
 * Then searches for the first constrained movement which a different id (still from start to end),
 * and returns the 'shift' to apply to the start of the range to reach this position
 *  => useful to remove all the constrained movements before (and including) a specific id
 */
export function ConstrainedMovementListSearchStartShiftById(
  constrainedMovementsList: ConstrainedMovementsList,
  id: number,
): number {
  const startToEnd: number = constrainedMovementsList.range.startToEnd();
  for (let i: number = 0; i < startToEnd; i++) {
    const index: number = (constrainedMovementsList.range.start + i) % constrainedMovementsList.range.size;
    if (constrainedMovementsList.ids[index] === id) {
      let j: number = i + 1;
      for (; j < startToEnd; j++) {
        const index: number = (constrainedMovementsList.range.start + j) % constrainedMovementsList.range.size;
        if (constrainedMovementsList.ids[index] !== id) {
          break;
        }
      }
      return j;
    }
  }

  return -1;
}

/** CLASS **/

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
    };

    const arrayToString = (values: Float64Array) => {
      return Array.from(values, _ => FloatToString(_, precision)).join(', ');
    };

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
