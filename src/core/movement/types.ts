import { TNumberArray } from '../helpers/types';

export type TMovement = TNumberArray;  // [...distances{axisCount}]
export type TOptimizedMovement = Float64Array; // [id, duration, normalizedAcceleration, normalizedVelocity, ...distances{axisCount}]
