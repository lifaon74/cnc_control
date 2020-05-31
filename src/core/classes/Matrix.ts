// http://www.zweigmedia.com/MundoReal/tutorialsf4/frames4_3.html
//https://en.wikipedia.org/wiki/Simplex_algorithm

export type Constructor<T> = new (...args: any[]) => T;
export type ArrayBufferView = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array;

// <T extends ArrayBufferView = Float64Array>

export class Matrix<T extends ArrayBufferView = Float64Array> {


  /**
   * Verify if the solutions are conform to the system of equations matrix
   *
   * @param matrix
   * @param solutions
   * @param precision
   * @returns {boolean}
   */
  static verifySystemOfEquationsProblemSolutions(matrix: Matrix, solutions: Matrix, precision: number = 1e-3): boolean {
    if(solutions === null) return true;

    const lastColumnNumber: number = matrix.n - 1;
    const lastColumnIndex: number = lastColumnNumber * matrix.m;

    for(let m = 0; m < matrix.m; m++) {
      let sum: number = 0;
      for(let n = 0; n < lastColumnIndex; n++) {
        sum +=  matrix.values[m + n * matrix.m] * solutions.values[n];
      }
      if(Math.abs(sum - matrix.values[m + lastColumnNumber]) > precision) return false;
    }

    return true;
  }


  public m: number; // number of rows
  public n: number; // number of columns
  public values: T;


  protected _type: Constructor<T>;

  /**
   * @param m number of rows
   * @param n number of columns
   * @param type
   */
  // constructor(m: number, n: number, values: ArrayBufferView = new Float64Array(m * n)) {
  constructor(m: number, n: number = m, type: Constructor<T> = Float64Array as any) {
    this.m = m;
    this.n = n;
    this._type = type;
  }

  get type(): Constructor<T> {
    return this._type;
  }

  /**
   * MATRIX INITIALIZER
   * must be called before any operations
   */

  /**
   * Create an empty matrix
   * @return {Matrix}
   */
  empty(): this {
    this.values = new this.type(this.m * this.n);
    return this;
  }

  /**
   * Create a matrix from an Array
   * @param {number[][]} array
   * @return {Matrix}
   */
  fromArray(array: number[][]): this {
    if(array.length !== this.m) throw new Error('array.length is not equal to matrix.m');
    for(let m = 0; m < this.m; m++) {
      if (array[m].length !== this.n) throw new Error('array[' + m + '].length is not equal to matrix.n');
    }
    this.empty();
    let i: number = 0;
    for(let n = 0; n < this.n; n++) {
      for(let m = 0; m < this.m; m++) {
        this.values[i++] = array[m][n]; // matrix.set(m, n, array[m][n]);
      }
    }
    return this;
  }

  /**
   * Create a matrix filled with 'array' values
   * @param {ArrayBufferView} array
   * @return {Matrix}
   */
  fromArrayBufferView(array: T): this {
    if(array.length !== (this.m * this.n)) throw new Error('array.length is not equal to matrix.m * matrix.n');
    this.values = array;
    return this;
  }


  /**
   * Create a matrix filled with 'value'
   * @param {number} value
   * @return {Matrix}
   */
  fill(value: number = 0): this {
    this.empty();
    for(let i = 0, l = this.values.length; i < l; i++) {
      this.values[i] = value;
    }
    return this;
  }


  // http://www.solitaryroad.com/c101.html

  /**
   * Create a scalar matrix
   * @param {number} value
   * @return {Matrix}
   */
  scalar(value: number): this {
    if(this.m !== this.n) throw new Error('matrix.n must be equal to matrix.m');
    this.empty();
    for(let i = 0; i < this.m; i++) {
      this.values[i + i * this.m] = value; // matrix.set(m, n, value);
    }
    return this;
  }

  /**
   * Create an identity matrix
   * @returns {Matrix}
   */
  identity(): this {
    return this.scalar(1);
  }





  clone(): Matrix<T> {
    return new Matrix<T>(this.m, this.n).fromArrayBufferView((this.values as any).slice());
  }


  get(m: number, n: number) {
    return this.values[m + n * this.m];
  }

  set(m: number, n: number, value: number) {
    this.values[m + n * this.m] = value;
  }


  toArray(): number[][] {
    const array: number[][] = [];
    for(let m = 0; m < this.m; m++) {
      array[m] = [];
      for(let n = 0; n < this.n; n++) {
        array[m][n] = this.values[m + n * this.m];
      }
    }
    return array;
  }

  toString(): string {
    let string: string = '[\n';
    for(let m = 0; m < this.m; m++) {
      if(m > 0) string += ',\n';
      string += '  [';
      for(let n = 0; n < this.n; n++) {
        if(n > 0) string += ', ';
        string += String(this.get(m, n));
      }
      string += ']';
    }
    string += '\n]\n';
    return string;
  }


  /**
   * Convert a set a standard maximization problem matrix into a simplex tableau
   *
   * Example:  => http://www.zweigmedia.com/MundoReal/tutorialsf4/frames4_3.html
   *
   *   Maximize p = 2x - 3y + 4z subject to the constraints
   *     4x - 3y + z <= 3
   *     x + y + z <= 10
   *     2x + y - z <= 10,
   *     x >= 0, y >= 0, z >= 0
   *
   *   Gives the matrix:
   *     4,	-3, 1, 3
   *     1, 1, 1, 10
   *     2, 1, -1, 10
   *     -2, 3, -4, 0
   *
   * @param outputMatrix
   * @returns {Matrix}
   */
  toSimplexTableau(outputMatrix?: Matrix<T>): Matrix<T> {
    // if(matrix_0.m !== matrix_0.n) {
    //   throw new Error('matrix.n must be equal to matrix.m');
    // }

    outputMatrix = this._getOutputMatrix(this.m, this.n + this.m - 1, outputMatrix);

    // variables
    for(let m = 0; m < this.m; m++) {
      for(let n = 0; n < this.n - 1; n++) {
        outputMatrix.values[m + n * outputMatrix.m] = this.values[m + n * this.m];
      }
    }

    // answers (last row)
    // const lastColumnIndex: number = (this.n - 1) * this.m;
    // const lastColumnIndexOutputMatrix: number = (outputMatrix.n - 1) * outputMatrix.m;
    // for(let m = 0; m < this.m; m++) {
    //   outputMatrix.values[m + lastColumnIndexOutputMatrix] = this.values[m + lastColumnIndex];
    // }
    const lastColumnIndex: number = (this.n - 1) * this.m;
    const lastColumnIndexOutputMatrix: number = (outputMatrix.n - 1) * outputMatrix.m;
    for(let m = lastColumnIndexOutputMatrix, l = m + this.m, offset = lastColumnIndex - lastColumnIndexOutputMatrix; m < l; m++) {
      outputMatrix.values[m] = this.values[m + offset];
    }

    // slack variables (identity matrix)
    for(let m = 0, l = this.m - 1; m < l; m++) {
      outputMatrix.values[m + (m + this.n - 1) * outputMatrix.m] = 1;
    }

    return outputMatrix;
  }


  /**
   * Compare the matrix  with 'matrix' and return true if all elements are equals
   * @param matrix
   * @param equalsCallback [optional]
   * @returns {boolean}
   */
  equals(
    matrix: Matrix,
    equalsCallback: ((a: number, b: number) => boolean) = ((a, b) => (a === b))
  ): boolean {
    if((this.m !== matrix.m) || (this.n !== matrix.n)) return false;
    for(let i = 0; i < this.values.length; i++) {
      if(!equalsCallback(this.values[i], matrix.values[i])) return false;
    }
    return true;
  }


  /**
   * Transpose the matrix
   * @param outputMatrix
   * @return {Matrix}
   */
  transpose(outputMatrix?: Matrix<T>): Matrix<T> {
    outputMatrix = this._getOutputMatrix(this.n, this.m, outputMatrix);

    let i: number = 0;
    for(let n = 0; n < outputMatrix.n; n++) {
      for(let m = 0; m < outputMatrix.m; m++) {
        outputMatrix.values[i++] = this.values[n + m * this.m]; // outputMatrix.set(m, n, this.get(n, m))
      }
    }
    return outputMatrix;
  }


  /**
   * Multiply two matrix
   * @param matrix
   * @param outputMatrix
   * @returns {Matrix}
   */
  multiply(matrix: Matrix, outputMatrix?: Matrix<T>): Matrix<T> {
    if(this.n !== matrix.m) throw new Error('this.n must be equal to matrix.m');
    outputMatrix = this._getOutputMatrix(this.m, matrix.n, outputMatrix);

    let i: number = 0, sum: number, k: number;
    for(let n = 0; n < outputMatrix.n; n++) {
      for(let m = 0; m < outputMatrix.m; m++) {
        sum = 0;
        k = n * matrix.m;
        for(let j = 0; j < this.n; j++) {
          sum += this.values[m + j * this.m] * matrix.values[j + k]; // sum += this.get(m, i) * matrix.get(i, n);
        }
        outputMatrix.values[i++] = sum;
      }
    }

    return outputMatrix;
  }


  /**
   * Compute the determinant of the matrix
   * @returns {number}
   */
  det(): number {
    if(this.n !== this.m) throw new Error('matrix.n must be equal to matrix.m');

    if(this.n === 2) {
      return this.values[0] * this.values[3] - this.values[1] * this.values[2];
    } else {
      throw new Error('TODO'); // TODO
    }
  }


  /**
   * Apply a pivot to a matrix
   * http://www.zweigmedia.com/MundoReal/tutorialsf1/frames2_2B.html
   *
   * @param m_pivot the row of the pivot
   * @param n_pivot the column of the pivot
   * @param outputMatrix
   * @returns {Matrix}
   */
  pivot(m_pivot: number, n_pivot: number, outputMatrix?: Matrix<T>): Matrix<T> {
    outputMatrix = this._getOutputMatrixFromThis(outputMatrix);

    const pivot: number             = outputMatrix.values[m_pivot + n_pivot * outputMatrix.m];
    const absolutePivot: number     = Math.abs(pivot);
    const pivotInvertedSign: number = -Math.sign(pivot);
    const pivotColumnIndex: number  = n_pivot * outputMatrix.m;

    for(let m = 0; m < outputMatrix.m; m++) {
      if(m !== m_pivot) {
        let a: number = pivotInvertedSign * outputMatrix.values[m + pivotColumnIndex];
        for(let n = 0; n < outputMatrix.n; n++) {
          let columnIndex: number = n * outputMatrix.m;
          outputMatrix.values[m + columnIndex] =
            absolutePivot * outputMatrix.values[m + columnIndex] +
            a * outputMatrix.values[m_pivot + columnIndex];
        }
      }
    }

    return outputMatrix;
  }






  /**
   * Solve a system of equations
   * http://www.zweigmedia.com/MundoReal/tutorialsf1/frames2_2B.html
   *
   * Example:
   *  1/2 * x + 2/3 * y = 1/6
   *  -2 * x + 1/4 * y = 1/2
   *
   * Gives the matrix:
   *    1/2, 2/3, 1/6,
   *    -2, 1/4, 1/2
   *
   * And return :
   *  1, 0, -0.2,
   *  0, 1, 0.4
   *
   * The last column contain the result
   *
   * @param outputMatrix
   * @returns {Matrix}
   */
  solveSystemOfEquationsProblem(outputMatrix?: Matrix<T>): Matrix<T> {
    if((this.m + 1) !== this.n) throw new Error('matrix.n must be equal to matrix.m + 1');
    outputMatrix = this._getOutputMatrixFromThis(outputMatrix);

    for(let m = 0; m < outputMatrix.m; m++){
      for(let n = 0; n < outputMatrix.m; n++) {
        if(outputMatrix.values[m + n * outputMatrix.m] !== 0) {
          outputMatrix.pivot(m, n, outputMatrix);
          outputMatrix._reduceRowsCoefficients();
          break;
        }
      }
    }

    let pivot: number;
    const lastColumnIndex: number = (outputMatrix.n - 1) * outputMatrix.m;
    for(let m = 0; m < outputMatrix.m; m++) {
      for(let n = 0; n < outputMatrix.m; n++) {
        pivot = outputMatrix.values[m + n * outputMatrix.m];
        if(pivot !== 0) {
          outputMatrix.values[m + lastColumnIndex] /= pivot;
          outputMatrix.values[m + n * outputMatrix.m] = 1;
          break;
        }
      }
    }

    return outputMatrix;
  }


  /**
   * Return the formatted solutions from solved matrix of a system of equations
   * or null if no solution
   *
   * In matrix:
   *  0, 1,  0.4,
   *  1, 0, -0.2
   *
   * Out matrix:
   *  -0.2,
   *   0.4
   *
   * @param outputMatrix
   * @returns {Matrix} | null
   */
  getSystemOfEquationsProblemSolutions(outputMatrix?: Matrix<T>): Matrix<T> | null {
    outputMatrix = this._getOutputMatrix(this.m, 1, outputMatrix);
    const lastColumnNumber: number = this.n - 1;
    const lastColumnIndex: number = lastColumnNumber * this.m;
    let n: number;

    for(let m = 0; m < this.m; m++) {
      for(n = 0; n < lastColumnNumber; n++) {
        if(this.values[m + n * this.m] === 1) { // WARN maybe Float.equals
          outputMatrix.values[n] = this.values[m + lastColumnIndex];
          break;
        }
      }
      if(n === lastColumnNumber) return null;
    }
    return outputMatrix;
  }




  // http://math.uww.edu/~mcfarlat/s-prob.htm
  // https://en.wikipedia.org/wiki/Simplex_algorithm
  // http://www.zweigmedia.com/MundoReal/tutorialsf4/frames4_3.html
  solveStandardMaximizationProblem(outputMatrix?: Matrix<T>): Matrix<T> | null { // simplex method
    outputMatrix = this._getOutputMatrixFromThis(outputMatrix);

    const lastRowIndex: number = outputMatrix.m - 1;
    const lastColumnNumber: number = outputMatrix.n - 1;
    const lastColumnIndex: number = lastColumnNumber * this.m;
    let columnIndex: number; // index of the pivot column

    let value_0: number/*, value_1: number*/, min: number, ratio: number;
    let column: number, row: number;

    let i: number = 0;
    const limit: number = outputMatrix.m * 100;
    while(i < limit) {
      column = row = -1;

      // search for most negative value, if all values >= 0 finish
      min = 0;
      for(let n = 0; n < lastColumnNumber; n++) {
        value_0 = outputMatrix.values[lastRowIndex + n * outputMatrix.m];
        if(value_0 < min) {
          column = n;
          min = value_0;
        }
      }

      if(column === -1) {
        // console.log('finished');
        return outputMatrix;
      }

      columnIndex = column * outputMatrix.m;
      min = 1;
      for(let m = 0; m < lastRowIndex; m++) {
        value_0 = outputMatrix.values[m + columnIndex];
        // value_1 = this.values[m + lastColumnIndex];
        // if((value_0 !== 0) && (Math.sign(value_0) === Math.sign(value_1))) {
        if(value_0 > 0) {
          ratio = outputMatrix.values[m + lastColumnIndex] / value_0;
          if((row === -1) || (ratio < min)) {
            row = m;
            min = ratio;
          }
        }
      }

      // console.log(row, column, min);

      if(row === -1) {
        // console.log('inconsistent');
        return null;
      }

      const pivot: number = outputMatrix.values[row + column * outputMatrix.m];
      for(let n = 0; n < outputMatrix.n; n++) {
        outputMatrix.values[row + n * outputMatrix.m] /= pivot;
      }

      outputMatrix.pivot(row, column, outputMatrix);

      // console.log(this.toString());

      i++;
    }

    return null;
  }


  /**
   * TODO write a test
   * Return the formatted solutions from solved matrix of a standard maximization problem
   *
   * Out matrix: [
   *    x,
   *    y,
   *    ...,
   *    slack0,
   *    slack1,
   *    ...
   *    maximum
   *  ]
   *
   * @param outputMatrix
   * @returns {Matrix}
   */
  getStandardMaximizationProblemSolutions(outputMatrix?: Matrix<T>): Matrix<T> {
    outputMatrix = this._getOutputMatrix(this.m, 1, outputMatrix);
    let lastColumnNumber: number = this.n - 1;
    let lastRowIndex: number = this.m - 1;
    let lastColumnIndex: number = lastColumnNumber * this.m;

    let value: number;
    let rowIndex: number;

    for(let n = 0; n < lastColumnNumber; n++) {
      rowIndex = -1;
      for(let m = 0; m < lastRowIndex; m++) {
        value = this.values[m + n * this.m];
        if(value === 1) {
          if(rowIndex === -1) {
            rowIndex = m;
          } else {
            rowIndex = -1;
            break;
          }
        } else if(value !== 0) {
          break;
        }
      }

      if(rowIndex !== -1) {
        outputMatrix.values[n] = this.values[rowIndex + lastColumnIndex];
      }
    }

    outputMatrix.values[lastColumnNumber] = this.values[this.values.length - 1];

    return outputMatrix;
  }




  /**
   * This function tries to divide an entire row by the best factor
   * to keep values in the range of floats, this avoids NaN,
   * Infinite and -Infinite values
   * @private
   */
  protected _reduceRowsCoefficients() {
    // console.log('bef', this.toString(), '\n');


    // try to reach 0 technique
    // let max: number, value: number;
    // for(let m_1 = 0; m_1 < this.m; m_1++) {
    //   max = 1;
    //
    //   for(let n_1 = 0; n_1 < this.n; n_1++) {
    //     value = Math.abs(this.values[m_1 + n_1 * this.m]);
    //     if(value < 1e-9) {
    //       this.values[m_1 + n_1 * this.m] = 0;
    //     } else {
    //       max = Math.max(max, value);
    //     }
    //   }
    //   for(let n_1 = 0; n_1 < this.n; n_1++) {
    //     this.values[m_1 + n_1 * this.m] /= max;
    //   }
    // }

    // try to reach 1 technique
    let sum: number, count:number, value: number;
    for(let m_1 = 0; m_1 < this.m; m_1++) {
      sum = 0;
      count = 0;

      for(let n_1 = 0; n_1 < this.n; n_1++) {
        value = Math.abs(this.values[m_1 + n_1 * this.m]);
        if(value < 1e-12) {
          this.values[m_1 + n_1 * this.m] = 0;
        } else {
          sum += Math.log(value);
          count++;
        }
      }

      if(count > 0) {
        value = Math.exp(sum / count);
        for(let n_1 = 0; n_1 < this.n; n_1++) {
          this.values[m_1 + n_1 * this.m] /= value;
        }
      }
    }

    // console.log(this.toString(), '\n');
  }


  /**
   * Check if outputMatrix is undefined or match specified size
   * @param {number} m
   * @param {number} n
   * @param {Matrix} outputMatrix
   * @return {Matrix}
   * @private
   */
  protected _getOutputMatrix(m: number, n: number, outputMatrix: Matrix<T>): Matrix<T> {
    if(outputMatrix === void 0) {
      return new Matrix<T>(m, n, this._type).empty();
    } else {
      if((outputMatrix.m !== m) || (outputMatrix.n !== n)) {
        throw new Error('Expected an outputMatrix of size : ' + m + ', ' + n);
      } else {
        return outputMatrix;
      }
    }
  }

  protected _getOutputMatrixFromThis(outputMatrix: Matrix<T>): Matrix<T> {
    if(outputMatrix === void 0) {
      return new Matrix<T>(this.m, this.n, this._type).fromArrayBufferView(this.values.slice() as any);
    } else if(outputMatrix === this) {
      return outputMatrix;
    } else {
      if((outputMatrix.m !== this.m) || (outputMatrix.n !== this.n)) {
        throw new Error('Expected an outputMatrix of size : ' + this.m + ', ' + this.n);
      } else {
        return outputMatrix.fromArrayBufferView(this.values.slice() as any);
      }
    }
  }
}

