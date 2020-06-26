import {
  SetUpStandardMaximizationProblemMatrixSlackVariables, SolveAndGetSolutionsOfStandardMaximizationProblemMatrix,
  VerifyMaximizationProblemMatrixSolutions
} from './helpers/standard-maximization-problem';
import { TNumberArray } from './helpers/types';
import { MatrixToString } from './helpers/math';
// import { CyclicTypedVectorArray } from './classes/cyclic/CyclicTypedVectorArray';
import {
  MovementOptimizer, MovementOptimizerCreateMaximizationMatrix
} from './movement/movement-optimizer/implementation';
import {
  OPTIMIZED_MOVEMENT_DISTANCE_OFFSET, OPTIMIZED_MOVEMENT_DURATION_OFFSET,
  OPTIMIZED_MOVEMENT_NORMALIZED_ACCELERATION_OFFSET, OPTIMIZED_MOVEMENT_NORMALIZED_VELOCITY_OFFSET
} from './movement/optimized-movements-list/implementation';

const MOTOR_STEPS = 200;
const MICRO_STEPS = 32;
const STEPS_PER_TURN = MOTOR_STEPS * MICRO_STEPS;
// const STEPS_PER_TURN = 1000;


const ACCELERATION_LIMIT = STEPS_PER_TURN / (1 / 1);
const VELOCITY_LIMIT = STEPS_PER_TURN / (1 / 2); // 1 turn / s | max 6.25
const JERK_LIMIT = STEPS_PER_TURN / (16 / 1) * 0;



/*--------------*/

/*-------- DEBUG -----------*/

export function random(a: number, b: number) {
  return Math.random() * (b - a) + a;
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

  const randValue = () => {
    return random(-2, 2);
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


export function render(optimizer: MovementOptimizer) {
  const scale: number = 4;
  const imageData = new ImageData(128, 128);

  const ctx: CanvasRenderingContext2D = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
  ctx.canvas.width = imageData.width;
  ctx.canvas.height = imageData.height;
  ctx.canvas.style.border = `2px solid black`;
  ctx.canvas.style.width = `${ imageData.width * scale }px`;
  ctx.canvas.style.height = `${ imageData.height * scale }px`;
  ctx.canvas.style.imageRendering = `pixelated`;
  ctx.imageSmoothingEnabled  = false;
  document.body.appendChild(ctx.canvas);

  const axisCount: number = 2;
  let currentMovement: Float64Array | null = null;
  const currentMovementDirection: Float64Array = new Float64Array(axisCount);
  const currentMovementDoneDistance: Float64Array = new Float64Array(axisCount);
  const currentMovementTargetDistance: Float64Array = new Float64Array(axisCount);
  let currentMovementStarTime: number;
  let currentMovementDuration: number;

  const headPosition: Float64Array = new Float64Array(axisCount);
  let headColor: number = 0;

  // for (let i = 0; i < imageData.data.length; i++) {
  //   imageData.data[i] = Math.random() * 256;
  // }
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  const drawHead = () => {
    headColor++;
    const index: number = (headPosition[0] + headPosition[1] * imageData.width) * 4;
    imageData.data[index] = headColor;
    imageData.data[index + 1] = 255;
    imageData.data[index + 2] = 0;
    imageData.data[index + 3] = 255;
    ctx.putImageData(imageData, 0, 0);
  };

  const checkPendingMovements = () => {
    if ((currentMovement === null) && (optimizer.pendingOptimizedMovements > 0)) {
      startMovement();
    }
  };

  const startMovement = () => {
    currentMovement = optimizer.read();
    console.log('startMovement', currentMovement);
    currentMovementStarTime = performance.now() / 1000;
    currentMovementDuration = currentMovement[OPTIMIZED_MOVEMENT_DURATION_OFFSET];
    for (let i = 0; i < axisCount; i++) {
      currentMovementDirection[i] = (currentMovement[OPTIMIZED_MOVEMENT_DISTANCE_OFFSET + i] >= 0) ? 1 : -1;
      currentMovementDoneDistance[i] = 0;
      currentMovementTargetDistance[i] = Math.floor(Math.abs(currentMovement[OPTIMIZED_MOVEMENT_DISTANCE_OFFSET + i]));
    }

    // ensures no empty movement exists
    if (currentMovementIsFinished()) {
      endCurrentMovement();
    }
  };

  const currentMovementIsFinished = (): boolean => {
    for (let i = 0; i < axisCount; i++) {
      if (currentMovementDoneDistance[i] < currentMovementTargetDistance[i]) {
        return false;
      }
    }
    return true;
  };

  const endCurrentMovement = () => {
    // console.log('endCurrentMovement');
    currentMovement = null;
  };

  const updateCurrentMovement = () => {
    if (currentMovement !== null) {
      const elapsedTime = (performance.now() / 1000) - currentMovementStarTime;

      const normalizedDistance: number = (elapsedTime >= currentMovementDuration)
        ? 1.0
        : (
          (0.5 * currentMovement[OPTIMIZED_MOVEMENT_NORMALIZED_ACCELERATION_OFFSET] * elapsedTime * elapsedTime)
          + currentMovement[OPTIMIZED_MOVEMENT_NORMALIZED_VELOCITY_OFFSET] * elapsedTime
        ); // [0, 1]


      let refreshHead: boolean = false;
      for (let i = 0; i < axisCount; i++) {
        const distance: number = Math.floor(Math.abs(currentMovement[OPTIMIZED_MOVEMENT_DISTANCE_OFFSET + i]) * normalizedDistance);
        if (distance > currentMovementDoneDistance[i]) {
          currentMovementDoneDistance[i]++;
          headPosition[i] += currentMovementDirection[i];
          // console.log('refreshHead');
          refreshHead = true;
        }
      }

      if (refreshHead) {
        drawHead();
      }

      if (currentMovementIsFinished()) {
        endCurrentMovement();
      }
    }
  }

  const loop = () => {
    checkPendingMovements();
    updateCurrentMovement();
    requestAnimationFrame(loop);
  };

  loop();
}


export function debugMovementOptimizer() {
  const axisCount: number = 2;

  const accelerationLimit: number = 0.1;
  const velocityLimit: number = 1;
  const jerkLimit: number = 0.1 * 0;
  // const accelerationLimit: number = 10;
  // const velocityLimit: number = 10;
  // const jerkLimit: number = 10;

  const accelerationLimits: Float64Array = new Float64Array(Array.from({ length: axisCount }, () => accelerationLimit));
  const velocityLimits: Float64Array = new Float64Array(Array.from({ length: axisCount }, () => velocityLimit));
  const jerkLimits: Float64Array = new Float64Array(Array.from({ length: axisCount }, () => jerkLimit));

  const optimizer = new MovementOptimizer(
    axisCount,
    accelerationLimits,
    velocityLimits,
    jerkLimits,
  );

  const test1 = () => {
    optimizer.write([1, 2]);
    // optimizer.optimizedMovements.printAll();
    // optimizer.write([2, -1]);
    optimizer.write([-1, -2]);
    optimizer.constrainedMovements.printAll();
    optimizer.optimizedMovements.printAll();
  }

  const test2 = () => {
    optimizer.write([1, 1]);
    optimizer.optimizedMovements.printAll();

    optimizer.write([1, 1]);
    optimizer.optimizedMovements.printAll();

    optimizer.write([1, 1]);
    optimizer.optimizedMovements.printAll();
  }

  const test3 = () => {
    optimizer.write([1, 1]);
    optimizer.optimizedMovements.printAll();
    console.log(optimizer.read());
    optimizer.optimizedMovements.printAll();
    optimizer.write([1, 1]);
    optimizer.optimizedMovements.printAll();
  }

  const test4 = () => {
    const rand = () => {
      return random(-1, 1);
    };

    for (let i = 0; i < 10; i++) {
      optimizer.write([rand(), rand()]);
    }
    optimizer.optimizedMovements.printAll();
  }

  const test5 = () => {
    const side: number = 64;
    optimizer.write([10, 10]);
    // optimizer.write([10, 0]);
    optimizer.write([side, 0]);
    optimizer.write([0, side]);
    optimizer.write([-side, 0]);
    optimizer.write([0, -side]);
    render(optimizer);
  }

  test1();
  // test2();
  // test3();
  // test4();
  // test5();


}


export function runDebug() {
  // debugStandardMaximizationProblem();
  // debugStandardMaximizationProblemSolver();
  debugMovementOptimizer();
  // debugCyclicIndex();
  // debugCyclicRange();
  // testMovementSolution();

}
