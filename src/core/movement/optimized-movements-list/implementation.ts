// [id, duration, normalizedAcceleration, normalizedVelocity, ...distance[i]{i}]
import { CyclicTypedVectorArray } from '../../classes/cyclic/CyclicTypedVectorArray';
import { TNumberArray } from '../../helpers/types';
import { FloatToString } from '../../helpers/math';


let OPTIMIZED_MOVEMENT_OFFSET: number = 0;
export const OPTIMIZED_MOVEMENT_ID_OFFSET = OPTIMIZED_MOVEMENT_OFFSET++;
export const OPTIMIZED_MOVEMENT_DURATION_OFFSET = OPTIMIZED_MOVEMENT_OFFSET++;
export const OPTIMIZED_MOVEMENT_NORMALIZED_ACCELERATION_OFFSET = OPTIMIZED_MOVEMENT_OFFSET++;
export const OPTIMIZED_MOVEMENT_NORMALIZED_VELOCITY_OFFSET = OPTIMIZED_MOVEMENT_OFFSET++;
export const OPTIMIZED_MOVEMENT_DISTANCE_OFFSET = OPTIMIZED_MOVEMENT_OFFSET++;

// export function OptimizedMovementListSearchIndexByIdFromEnd(
//   optimizedMovements: OptimizedMovementsList,
//   id: number,
// ): number {
//   const optimizedMovementsCount: number = optimizedMovements.range.startToEnd();
//   const vectorLength: number = optimizedMovements.vectorLength;
//   const offset: number = optimizedMovements.range.end - vectorLength + optimizedMovements.range.size;
//   for (let i: number = 0; i < optimizedMovementsCount; i += vectorLength) {
//     const index: number = (offset - i) % optimizedMovements.range.size;
//     if (optimizedMovements.array[index/* + OPTIMIZED_MOVEMENT_ID_OFFSET*/] === id) {
//       let j: number = i + vectorLength;
//       for (; j < optimizedMovementsCount; j += vectorLength) {
//         const index: number = (offset - j) % optimizedMovements.range.size;
//         if (optimizedMovements.array[index/* + OPTIMIZED_MOVEMENT_ID_OFFSET*/] !== id) {
//           break;
//         }
//       }
//       return (offset - j + vectorLength) % optimizedMovements.range.size;
//     }
//   }
//
//   return -1;
// }

/**
 * Searches from the end of 'optimizedMovementsList' the first optimized movement matching 'id'.
 * Then searches for the first optimized movement which a different id (still from end to start),
 * and returns the 'shift' to apply to the end of the range to reach this position
 *  => useful to remove all the optimized movements after (and including) a specific id
 */
export function OptimizedMovementListSearchEndShiftById(
  optimizedMovementsList: OptimizedMovementsList,
  id: number,
): number {
  const startToEnd: number = optimizedMovementsList.range.startToEnd();
  const vectorLength: number = optimizedMovementsList.vectorLength;
  const offset: number = optimizedMovementsList.range.end - vectorLength + optimizedMovementsList.range.size;
  for (let i: number = 0; i < startToEnd; i += vectorLength) {
    const index: number = (offset - i) % optimizedMovementsList.range.size;
    if (optimizedMovementsList.array[index/* + OPTIMIZED_MOVEMENT_ID_OFFSET*/] === id) {
      let j: number = i + vectorLength;
      for (; j < startToEnd; j += vectorLength) {
        const index: number = (offset - j) % optimizedMovementsList.range.size;
        if (optimizedMovementsList.array[index/* + OPTIMIZED_MOVEMENT_ID_OFFSET*/] !== id) {
          break;
        }
      }
      // return ((j / vectorLength) + 1) % (optimizedMovementsCount / vectorLength);
      // return ((j - vectorLength) % optimizedMovementsCount) / vectorLength;
      // return (j % optimizedMovementsCount) / vectorLength;
      // return j / vectorLength;
      return j;
    }
  }

  return -1;
}

/** CLASS **/

export class OptimizedMovementsList extends CyclicTypedVectorArray<Float64Array> {
  public readonly axisCount: number;

  constructor(
    axisCount: number,
    size?: number
  ) {
    const vectorLength: number = OPTIMIZED_MOVEMENT_DISTANCE_OFFSET + axisCount;
    super(
      new Float64Array((size === void 0) ? (vectorLength * 1e6) : size),
      vectorLength
    );
    this.axisCount = axisCount;
  }

  writeMovement(
    id: number,
    duration: number,
    normalizedAcceleration: number,
    normalizedVelocity: number,
    movement: TNumberArray,
  ): void {
    let index: number = this.range.end;
    this.range.shiftEnd(this.vectorLength);
    this.array[index++] = id;
    this.array[index++] = duration;
    this.array[index++] = normalizedAcceleration;
    this.array[index++] = normalizedVelocity;
    for (let i: number = 0, l = this.axisCount; i < l; i++) {
      this.array[index++] = movement[i];
    }
  }

  printAll(): void {
    for (let i: number = 0, l = this.readable(); i < l; i++) {
      this.print((this.range.start + i * this.vectorLength) % this.range.size);
    }
  }

  print(index: number, precision: number = 5): void {
    const id: number = this.array[index + OPTIMIZED_MOVEMENT_ID_OFFSET];
    const duration: number = this.array[index + OPTIMIZED_MOVEMENT_DURATION_OFFSET];
    const normalizedAcceleration: number = this.array[index + OPTIMIZED_MOVEMENT_NORMALIZED_ACCELERATION_OFFSET];
    const normalizedVelocity: number = this.array[index + OPTIMIZED_MOVEMENT_NORMALIZED_VELOCITY_OFFSET];
    const distances: Float64Array = this.array.subarray(index + OPTIMIZED_MOVEMENT_DISTANCE_OFFSET, index + OPTIMIZED_MOVEMENT_DISTANCE_OFFSET + this.axisCount);

    const normalizedAccelerations: Float64Array = distances.map((distance: number) => distance * normalizedAcceleration);
    const normalizedVelocities: Float64Array = distances.map((distance: number) => distance * normalizedVelocity);

    const numberToString = (value: number) => {
      return FloatToString(value, precision);
    };

    const arrayToString = (values: Float64Array) => {
      return Array.from(values, _ => FloatToString(_, precision)).join(', ');
    };


    console.log(`optimized movement:
      id: ${ id }
      duration: ${ numberToString(duration) }
      normalizedAcceleration: ${ numberToString(normalizedAcceleration) }  [${ arrayToString(normalizedAccelerations) }]
      normalizedVelocity: ${ numberToString(normalizedVelocity) } [${ arrayToString(normalizedVelocities) }]
      distances: [${ arrayToString(distances) }]
    `);
  }
}
