
export interface IMovementOptimizer {
  readonly axisCount: number;
  readonly accelerationLimits: Float64Array;
  readonly velocityLimits: Float64Array;
  readonly jerkLimits: Float64Array;
}
