import { TArrayLikeTypedConstructor, TNumberArray } from './types';
import { MatrixToString } from './math';


// https://college.cengage.com/mathematics/larson/elementary_linear/4e/shared/downloads/c09s3.pdf
// https://courses.lumenlearning.com/finitemath1/chapter/reading-solving-standard-maximization-problems-using-the-simplex-method/
// http://www.solving-math-problems.com/simplex-method-solve-standard-maximization-problem.html

export function GetStandardMaximizationProblemMatrixColumnCount(
  variableCount: number,
  constraintCount: number,
): number {
  return variableCount + constraintCount + 1;
}

export function GetStandardMaximizationProblemMatrixRowCount(
  constraintCount: number,
): number {
  return constraintCount + 1;
}

export function GetStandardMaximizationProblemMatrixVariableCount(
  rows: number,
  columns: number,
): number {
  return columns - rows;
}

export function GetStandardMaximizationProblemMatrixConstraintCount(
  rows: number,
): number {
  return rows - 1;
}


export function CreateEmptyStandardMaximizationProblemMatrix<TMatrix extends TNumberArray>(
  ctor: TArrayLikeTypedConstructor<TMatrix>,
  variableCount: number,
  constraintCount: number,
): TMatrix {
  return new ctor(
    GetStandardMaximizationProblemMatrixColumnCount(variableCount, constraintCount)
    * GetStandardMaximizationProblemMatrixRowCount(constraintCount)
  );
}


export function SetUpStandardMaximizationProblemMatrixSlackVariables(
  matrix: TNumberArray,
  rows: number,
  columns: number,
): void {
  const constraintCount: number = GetStandardMaximizationProblemMatrixConstraintCount(rows);
  const slackVariablesStartIndex: number = rows * GetStandardMaximizationProblemMatrixVariableCount(rows, columns);
  const matrixLength: number = (rows * columns);
  for (
    let
      column: number = 0,
      slackVariableIndex: number = slackVariablesStartIndex
    ;
    column < constraintCount;
    column++,
      slackVariableIndex += rows
  ) {
    for (let row: number = 0; row < constraintCount; row++) {
      matrix[slackVariableIndex + row] = (column === row) ? 1 : 0;
    }
  }

  for (
    let i: number = (slackVariablesStartIndex + constraintCount);
    i < matrixLength;
    i += rows
  ) {
    matrix[i] = 0;
  }
}


export function SetUpStandardMaximizationProblemMatrixMaximize(
  maximize: ArrayLike<number>,
  matrix: TNumberArray,
  rows: number,
): void {
  const maximizeLength: number = maximize.length;
  for (
    let
      i: number = 0,
      j: number = GetStandardMaximizationProblemMatrixConstraintCount(rows);
    i < maximizeLength;
    i++,
      j += rows
  ) {
    matrix[j] = -maximize[i];
  }
}

export function VerifySetUpStandardMaximizationProblemMatrixMaximizeArguments(
  variableCount: number,
  maximize: ArrayLike<number>,
): void {
  if (maximize.length !== variableCount) {
    throw new Error(`maximize must have a size of ${ variableCount }`);
  }
}


export function SetUpStandardMaximizationProblemMatrixConstraints(
  constraints: ArrayLike<number>[],
  matrix: TNumberArray,
  rows: number,
  columns: number,
): void {
  const constraintCount: number = GetStandardMaximizationProblemMatrixConstraintCount(rows);
  const variableCount: number = GetStandardMaximizationProblemMatrixVariableCount(rows, columns);
  const lastColumnIndex: number = (columns - 1) * rows;
  for (let i: number = 0; i < constraintCount; i++) {
    const constraint: ArrayLike<number> = constraints[i];
    for (
      let
        j: number = 0,
        k: number = i;
      j < variableCount;
      j++,
        k += rows
    ) {
      matrix[k] = constraint[j];
    }
    matrix[i + lastColumnIndex] = constraint[variableCount];
  }
}

export function VerifySetUpStandardMaximizationProblemMatrixMaximizeConstraintsArgument(
  variableCount: number,
  constraintCount: number,
  constraints: ArrayLike<number>[],
): void {
  if (constraints.length === constraintCount) {
    const constraintLength: number = variableCount + 1;
    for (let i = 0; i < constraintCount; i++) {
      if (constraints[i].length !== constraintLength) {
        throw new Error(`constraint[${ i }]  must have a size of ${ constraintLength }`);
      }
    }
  } else {
    throw new Error(`constraints must have a size of ${ constraintCount }`);
  }
}


export function SetUpStandardMaximizationProblemMatrix(
  maximize: ArrayLike<number>,
  constraints: ArrayLike<number>[],
  matrix: TNumberArray,
): void {
  const rows: number = GetStandardMaximizationProblemMatrixRowCount(constraints.length);
  const columns: number = GetStandardMaximizationProblemMatrixColumnCount(maximize.length, constraints.length);
  SetUpStandardMaximizationProblemMatrixSlackVariables(
    matrix,
    rows,
    columns,
  );
  SetUpStandardMaximizationProblemMatrixMaximize(
    maximize,
    matrix,
    rows,
  );
  SetUpStandardMaximizationProblemMatrixConstraints(
    constraints,
    matrix,
    rows,
    columns,
  );
}


export function CreateStandardMaximizationProblemMatrix<TMatrix extends ArrayLike<number>>(
  ctor: TArrayLikeTypedConstructor<TMatrix>,
  maximize: ArrayLike<number>,
  constraints: ArrayLike<number>[],
): TMatrix {
  const matrix: TMatrix = CreateEmptyStandardMaximizationProblemMatrix<TMatrix>(ctor, maximize.length, constraints.length);

  SetUpStandardMaximizationProblemMatrix(
    maximize,
    constraints,
    matrix,
  );

  return matrix;
}

export function FindStandardMaximizationProblemMatrixPivotColumn(
  matrix: TNumberArray,
  rows: number,
  columns: number,
): number {
  const lastColumnNumber: number = columns - 1;

  let pivotColumn: number = -1;
  let minValue: number = 0;

  for (
    let
      column: number = 0,
      i: number = rows - 1;
    column < lastColumnNumber;
    column++,
      i += rows
  ) {
    const value: number = matrix[i];
    if (value < minValue) {
      pivotColumn = column;
      minValue = value;
    }
  }

  return pivotColumn;
}

export function FindStandardMaximizationProblemMatrixPivotRow(
  matrix: TNumberArray,
  rows: number,
  columns: number,
  pivotColumn: number,
): number {
  const pivotColumnIndex: number = pivotColumn * rows;
  const lastRowIndex: number = rows - 1;
  const lastColumnIndex: number = (columns - 1) * rows;

  let pivotRow: number = -1;
  let minRatio: number = 1;

  for (let row: number = 0; row < lastRowIndex; row++) {
    const value: number = matrix[row + pivotColumnIndex];
    if (value > 0) {
      const ratio: number = matrix[row + lastColumnIndex] / value;
      if ((pivotRow === -1) || (ratio < minRatio)) {
        pivotRow = row;
        minRatio = ratio;
      }
    }
  }

  return pivotRow;
}

export function ApplyGaussianEliminationToStandardMaximizationProblemMatrix(
  matrix: TNumberArray,
  rows: number,
  columns: number,
  pivotRow: number,
  pivotColumn: number,
): void {
  const matrixLength: number = (rows * columns);

  // divide pivot's row by the pivot's value to transform the pivot into 1
  const pivotValue: number = matrix[pivotRow + pivotColumn * rows];
  for (let i: number = pivotRow; i < matrixLength; i += rows) {
    matrix[i] /= pivotValue;
  }

  // https://www.zweigmedia.com/MundoReal/tutorialsf1/22help2.html
  // https://www.zweigmedia.com/MundoReal/tutorialsf1/frames2_2B.html
  // apply gaussian elimination
  const pivotColumnIndex: number = pivotColumn * rows;
  for (let row: number = 0; row < rows; row++) {
    if (row !== pivotRow) {
      const negatedColumnValue: number = -matrix[pivotColumnIndex + row];
      for (
        let columnIndex: number = 0;
        columnIndex < matrixLength;
        columnIndex += rows
      ) {
        matrix[row + columnIndex] = negatedColumnValue * matrix[pivotRow + columnIndex] + matrix[row + columnIndex];
      }
    }
  }
  // const pivot: number = matrix[pivotRow + pivotColumn * rows];
  // const pivotColumnIndex: number = pivotColumn * rows;
  // for (let row: number = 0; row < rows; row++) {
  //   if (row !== pivotRow) {
  //     const value: number = matrix[pivotColumnIndex + row];
  //     if (value !== 0) {
  //       const factor: number = pivot / value;
  //       for (
  //         let columnIndex: number = 0;
  //         columnIndex < matrixLength;
  //         columnIndex += rows
  //       ) {
  //         matrix[row + columnIndex] = factor * matrix[row + columnIndex] - matrix[pivotRow + columnIndex];
  //       }
  //     }
  //   }
  // }
}


export function SolveStandardMaximizationProblemMatrixIteration(
  matrix: TNumberArray,
  rows: number,
  columns: number,
): boolean {
  // 1) search pivot column => largest negative coefficient in the row containing the objective function (bottom row)
  const pivotColumn: number = FindStandardMaximizationProblemMatrixPivotColumn(matrix, rows, columns);

  if (pivotColumn === -1) {
    return true;
  }

  // 2) search pivot row => largest negative coefficient in the row containing the objective function (bottom row)
  const pivotRow: number = FindStandardMaximizationProblemMatrixPivotRow(matrix, rows, columns, pivotColumn);

  if (pivotRow === -1) {
    throw new Error(`Problem is not solvable`);
  }

  // console.log('pivotRow', pivotRow, 'pivotColumn', pivotColumn);

  // 3) apply gaussian elimination
  ApplyGaussianEliminationToStandardMaximizationProblemMatrix(
    matrix,
    rows,
    columns,
    pivotRow,
    pivotColumn,
  );

  return false;
}

export function SolveStandardMaximizationProblemMatrix(
  matrix: TNumberArray,
  rows: number,
  columns: number,
  maxIterations: number = rows * 100,
): void {

  let i: number = 0;
  while ((i++ < maxIterations) && !SolveStandardMaximizationProblemMatrixIteration(matrix, rows, columns)) {
    // console.log(MatrixToString(matrix, rows, columns));
    // debugger;
  }

  if (i >= maxIterations) {
    throw new Error(`Max iteration reached`);
  }
}


export function GetResolvedStandardMaximizationProblemMatrixSolutionRow(
  matrix: TNumberArray,
  rows: number,
  column: number, // INFO the index of the column
): number {
  const lastRowIndex: number = rows - 1;
  const columnIndex: number = column * rows;
  let rowIndex: number = -1;
  for (let row: number = 0; row < lastRowIndex; row++) {
    const value: number = matrix[columnIndex + row];
    if (value === 1) {
      if (rowIndex === -1) {
        rowIndex = row;
      } else {
        rowIndex = -1;
        break;
      }
    } else if (value !== 0) {
      break;
    }
  }
  return rowIndex;
}

// export function GetResolvedStandardMaximizationProblemMatrixSolutions<TOutput extends TNumberArray>(
//   matrix: TNumberArray,
//   rows: number,
//   columns: number,
//   output: TOutput,
// ): TOutput {
//   const variableCount: number = GetStandardMaximizationProblemMatrixVariableCount(rows, columns);
//   const lastColumnIndex: number = (columns - 1) * rows;
//   for (let column: number = 0; column < variableCount; column++) {
//     const rowIndex: number = GetResolvedStandardMaximizationProblemMatrixSolutionRow(matrix, rows, column);
//     if (rowIndex === -1) {
//       console.log(
//         MatrixToString(
//           matrix,
//           rows,
//           columns,
//         )
//       );
//       throw new Error(`Matrix is not resolved`);
//     } else {
//       output[column] = matrix[lastColumnIndex + rowIndex];
//     }
//   }
//   return output;
// }

export function GetResolvedStandardMaximizationProblemMatrixSolutions<TOutput extends TNumberArray>(
  matrix: TNumberArray,
  rows: number,
  columns: number,
  output: TOutput,
): TOutput {
  const variableCount: number = GetStandardMaximizationProblemMatrixVariableCount(rows, columns);
  const lastColumnIndex: number = (columns - 1) * rows;
  for (let column: number = 0; column < variableCount; column++) {
    const rowIndex: number = GetResolvedStandardMaximizationProblemMatrixSolutionRow(matrix, rows, column);
    output[column] = (rowIndex === -1)
      ? 0
      : matrix[lastColumnIndex + rowIndex];
  }
  return output;
}

export function VerifyResolvedStandardMaximizationProblemMatrixOutputArgument(
  variableCount: number,
  output: TNumberArray,
): void {
  if (output.length !== variableCount) {
    throw new Error(`output must have a size of ${ variableCount }`);
  }
}


export function SolveAndGetSolutionsOfStandardMaximizationProblemMatrix<TOutput extends TNumberArray>(
  matrix: TNumberArray,
  rows: number,
  columns: number,
  output: TOutput,
): TOutput {
  SolveStandardMaximizationProblemMatrix(matrix, rows, columns);
  return GetResolvedStandardMaximizationProblemMatrixSolutions<TOutput>(matrix, rows, columns, output);
}

export function VerifyMaximizationProblemMatrixSolutions(
  matrix: TNumberArray,
  rows: number,
  columns: number,
  solution: TNumberArray,
): void {
  const variableCount: number = GetStandardMaximizationProblemMatrixVariableCount(rows, columns);
  const lastColumnIndex: number = (columns - 1) * rows;

  for (let row: number = 0; row < rows; row++) {
    let sum: number = 0;
    for (let column: number = 0; column < variableCount; column++) {
      sum += matrix[row + column * rows] * solution[column];
    }
    if (sum > matrix[row + lastColumnIndex]) {
      throw new Error(`Matrix not properly resolved`);
    }
  }
}





/*-------------------------*/

export class StandardMaximizationProblemSolver {
  static create(
    maximize: ArrayLike<number>,
    constraints: ArrayLike<number>[],
  ): StandardMaximizationProblemSolver {
    return new StandardMaximizationProblemSolver(maximize.length, constraints.length)
      .setUp(maximize, constraints);
  }

  public readonly variableCount: number;
  public readonly constraintCount: number;
  public readonly matrix: Float64Array;
  public readonly columns: number;
  public readonly rows: number;

  constructor(
    variableCount: number,
    constraintCount: number,
  ) {
    this.variableCount = variableCount;
    this.constraintCount = constraintCount;
    this.columns = GetStandardMaximizationProblemMatrixColumnCount(this.variableCount, this.constraintCount);
    this.rows = GetStandardMaximizationProblemMatrixRowCount(this.constraintCount);
    this.matrix = new Float64Array(this.columns * this.rows);
    this.matrix.fill(123);
  }

  setUp(
    maximize: ArrayLike<number>,
    constraints: ArrayLike<number>[],
  ): this {
    VerifySetUpStandardMaximizationProblemMatrixMaximizeArguments(this.variableCount, maximize);
    VerifySetUpStandardMaximizationProblemMatrixMaximizeConstraintsArgument(this.variableCount, this.constraintCount, constraints);
    SetUpStandardMaximizationProblemMatrix(maximize, constraints, this.matrix);
    return this;
  }

  solve<TOutput extends ArrayLike<number> = Float64Array>(
    output: TOutput = new Float64Array(this.variableCount) as unknown as TOutput
  ): TOutput {
    VerifyResolvedStandardMaximizationProblemMatrixOutputArgument(this.variableCount, output);
    return SolveAndGetSolutionsOfStandardMaximizationProblemMatrix(
      this.matrix,
      this.rows,
      this.columns,
      output,
    );
  }
}

/*---*/

export function debugStandardMaximizationProblemSolver(): void {

  // const solver = StandardMaximizationProblemSolver.create(
  //   [7, 12],
  //   [
  //     [2, 3, 6],
  //     [3, 7, 12],
  //   ]
  // );

  const solver = StandardMaximizationProblemSolver.create(
    [4, 6],
    [
      [-1, 1, 11],
      [1, 1, 27],
      [2, 5, 90],
    ]
  );


  console.log(MatrixToString(solver.matrix, solver.rows, solver.columns));
  console.log(solver.solve());
  console.log(MatrixToString(solver.matrix, solver.rows, solver.columns));
}
