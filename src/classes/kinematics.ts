import { Float } from './lib/Float';
import { Matrix } from './lib/Matrix';

export type ArrayBufferView = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

export interface ArrayBufferViewConstructor {
  new (size: number): ArrayBufferView;
}

// export class DynamicArrayBufferCollection {
//
//   public _buffers: { [key: string]: DynamicArrayBufferView<any> };
//
//   /**
//    * Create a buffer.
//    * @param {string} name
//    * @param {DynamicArrayBufferView<any>} buffer
//    * @returns {this}
//    */
//   createBuffer(name: string, buffer: DynamicArrayBufferView<any>): this {
//     // this._buffers[name] = typedArray;
//     Object.defineProperty(this._buffers, name, {
//       value : buffer,
//       writable : true,
//       enumerable : true,
//       configurable : false
//     });
//     return this;
//   }
//
//   getBuffer(name: string): DynamicArrayBufferView<any> {
//     return this._buffers[name];
//   }
//
// }

/**
 * A CorrelatedArrayBuffers is a list of buffers (data) which size can be easilly adjusted
 */
export class CorrelatedArrayBuffers {

  static sliceTypedArray(typedArray: any, start: number, end: number, copy: boolean = true) {
    if((start < 0) || (end > typedArray.length)) {
      let array = new typedArray.constructor(end - start);
      array.set(typedArray.subarray(Math.max(0, start), Math.min(typedArray.length, end)), Math.abs(start));
      return array;
    } else {
      return copy ? typedArray.slice(start, end) : typedArray.subarray(start, end);
    }
  }

  // INFO deprecated
  static roundFloatArray(source: Float32Array | Float64Array, destination: ArrayBufferView = source) {
    let value: number = 0;
    let roundedValue: number = 0;
    let delta: number;

    for(let i = 0; i < source.length; i++) {
      value += source[i];
      delta = Math.round(value - roundedValue);
      roundedValue += delta;
      destination[i] = delta;
    }
  }

  public _buffers: { [key: string]: ArrayBufferView };
  public _allocated: number;
  public _length: number;

  constructor(allocated: number = 0, buffers: { [key: string]: ArrayBufferViewConstructor } = {}) {
    this._buffers  = {};
    this._allocated   = allocated;
    this._length      = 0;

    for(const key in buffers) {
      this.createBuffer(key, new (buffers[key])(this._allocated));
    }
  }

  get length(): number {
    return this._length;
  }

  set length(length: number) {
    this._length = length;
    this.require(length);
  }

  get allocated(): number {
    return this._allocated;
  }

  get bufferNames(): string[] {
    return Object.keys(this._buffers);
  }

  /**
   * Creates a buffer.
   * @param {string} name
   * @param {ArrayBufferView} typedArray
   * @returns {this}
   */
  createBuffer(name: string, typedArray: ArrayBufferView): this {
    // this._buffers[name] = typedArray;
    Object.defineProperty(this._buffers, name, {
      value : typedArray,
      writable : true,
      enumerable : true,
      configurable : false
    });
    return this;
  }

  getBuffer(name: string): ArrayBufferView {
    return this._buffers[name];
  }

  /**
   * Requires a min size of 'size'
   * @param {number} size
   * @returns {this}
   */
  require(size: number): this {
    if(this._allocated < size) {
      this.allocate(size);
    }
    return this;
  }

  /**
   * Sets the size of the buffers
   * @param {number} size
   * @returns {this}
   */
  allocate(size: number): this {
    this._allocated = size;
    this.transferBuffers();
    return this;
  }

  /**
   * Remove unused bytes
   * @returns {this}
   */
  compact(): this {
    this.allocate(this._length);
    return this;
  }

  /**
   * Moves data at index_1 to index_0
   * @param {number} index_0
   * @param {number} index_1
   * @returns {this}
   */
  move(index_0: number, index_1: number): this {
    const bufferNames: string[] = this.bufferNames;
    let buffer: ArrayBufferView;
    for(let i = 0, l = bufferNames.length; i <l; i++) {
      buffer = this._buffers[bufferNames[i]];
      buffer[index_0] = buffer[index_1];
    }
    return this;
  }

  /**
   * Transfers 'this._allocated' bytes from the buffers to the start of the buffers (used for resize)
   */
  protected transferBuffers(): void {
    const bufferNames: string[] = this.bufferNames;
    let bufferName: string;
    for(let i = 0, l = bufferNames.length; i < l; i++) {
      bufferName = bufferNames[i];
      this._buffers[bufferName] = CorrelatedArrayBuffers.sliceTypedArray(this._buffers[bufferName], 0, this._allocated, false)
    }
  }

}


/**
 * A CorrelatedArrayBuffersTree is a list of buffers (data) and children buffer which size can be easilly adjusted
 */
export class CorrelatedArrayBuffersTree extends CorrelatedArrayBuffers {
  public children: CorrelatedArrayBuffers[];

  constructor(allocated: number, buffers: { [key: string]: ArrayBufferViewConstructor }) {
    super(allocated, buffers);

    this.children = [];
  }

  get length(): number {
    return this._length;
  }

  set length(length: number) {
    this._length = length;
    for(let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].length = length;
    }
    super.require(length);
  }

  /**
   * Requires a min size of 'size'
   * @param {number} size
   * @returns {this}
   */
  require(size: number): this {
    for(let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].require(size);
    }
    return super.require(size);
  }

  /**
   * Sets the size of the buffers
   * @param {number} size
   * @returns {this}
   */
  allocate(size: number): this {
    for(let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].allocate(size);
    }
    return super.allocate(size);
  }

  /**
   * Remove unused bytes
   * @returns {this}
   */
  compact(): this {
    for(let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].compact();
    }
    return super.compact();
  }

  /**
   * Moves data at index_1 to index_0
   * @param {number} index_0
   * @param {number} index_1
   * @returns {this}
   */
  move(index_0: number, index_1: number): this {
    for(let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].move(index_0, index_1);
    }
    return super.move(index_0, index_1);
  }


}



/**
 * A MovementsSequence is a list of single axis movements
 */
export class MovementsSequence extends CorrelatedArrayBuffers {

  constructor(allocated: number, buffers: { [key: string]: ArrayBufferViewConstructor }) {
    if (!('values' in buffers)) throw new Error('Missing \'values\' in buffers');
    super(allocated, buffers);
  }


  /**
   * Rounds all values of the movement
   * @param buffer
   */
  roundValues(buffer: any = this._buffers['values']): void {
    let value: number = 0;
    let roundedValue: number = 0;
    let delta: number;

    for(let i = 0; i < this._length; i++) {
      value += this._buffers['values'][i];
      delta = Math.round(value - roundedValue);
      roundedValue += delta;
      buffer[i] = delta;
    }
  }

}

/**
 * A SynchronizedMovementsSequence is a list of multi axis movements
 */
export class SynchronizedMovementsSequence extends CorrelatedArrayBuffersTree {

  public children: MovementsSequence[];

  constructor(allocated: number, buffers: { [key: string]: ArrayBufferViewConstructor }) {
    // if(!('values' in buffers)) throw new Error('Missing \'values\' in buffers');
    super(allocated, buffers);
  }

  roundValues(): void {
    for(let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].roundValues();
    }
  }

  /**
   * Returns true if all children's buffers['values'] (movements) are equals to 0
   * @param {number} index
   * @param {number} precision
   * @returns {boolean}
   */
  isNull(index: number, precision: number = ConstrainedSynchronizedMovementsSequence.DEFAULT_PRECISION): boolean {
    for(let i = 0, l = this.children.length; i < l; i++) {
      if(!Float.isNull(this.children[i]._buffers['values'][index], precision)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if children's buffers['values'] (forming a movements vector) at index_0 is collinear with index_1
   * @param {number} index_0
   * @param {number} index_1
   * @param {number} precision
   * @returns {boolean}
   */
  areCollinear(index_0: number, index_1: number, precision: number = ConstrainedSynchronizedMovementsSequence.DEFAULT_PRECISION): boolean {
    let movesSequence: ConstrainedMovementsSequence;
    let f_0: number = NaN; // if factor === NaN it is a wildcard (all values accepted)
    let f_1: number;
    let positive: boolean;
    let value_0: number;
    let value_1: number;

    for(let i = 0, l = this.children.length; i < l; i++) {
      movesSequence = this.children[i];
      value_0 = Float.round(movesSequence._buffers['values'][index_0], precision);
      value_1 = Float.round(movesSequence._buffers['values'][index_1], precision);
      if(Float.isNaN(f_0)) {
        f_0 = value_0 / value_1;
        positive = value_1 > value_0;
      } else { // f_0 !== NaN
        f_1 = value_0 / value_1;
        if(
          !Float.isNaN(f_1) &&
          ((f_0 !== f_1) || ((value_1 > value_0) !== positive))
        ) {
          return false;
        }
      }
    }
    return true;
  }


  /**
   * Removes unnecessary movements
   */
  reduce(): void {
    if(this._length > 0) {
      const length: number = this._length;
      let readIndex: number = 1;
      let writeIndex: number = 0;
      for(; readIndex < length; readIndex++) {
        if(!this.merge(writeIndex, readIndex)) {
          // readIndex cannot be merged in writeIndex
          writeIndex++; // go to next movement
          if(writeIndex !== readIndex) {
            this.move(writeIndex, readIndex); // write readIndex in writeIndex
          }
        }
      }
      this.length = writeIndex + (this.isNull(writeIndex) ? 0 : 1);
    }
  }

  /**
   * Try to merge 2 movements,
   * can only append if both movements are collinear
   * return true if index_1 has been merged in index_0
   *
   * @param index_0 movement_0 where de merge will occur
   * @param index_1 movement_1 to remove if mergeable
   * @param precision
   * @returns {boolean}
   */
  merge(index_0: number, index_1: number, precision: number = ConstrainedSynchronizedMovementsSequence.DEFAULT_PRECISION): boolean {
    if(this.areCorrelated(index_0, index_1, precision)) {
      let movesSequence: ConstrainedMovementsSequence;
      for(let i = 0, l = this.children.length; i < l; i++) {
        movesSequence = this.children[i];
        movesSequence._buffers['values'][index_0] += movesSequence._buffers['values'][index_1];
        // movesSequence._buffers.values[index_1] = 0; // => to force erase
      }
      return true;
    } else {
      return false;
    }
  }

  areCorrelated(index_0: number, index_1: number, precision: number = ConstrainedSynchronizedMovementsSequence.DEFAULT_PRECISION): boolean {
    // return this.isNull(index_0) || this.isNull(index_1) || this.areCollinear(index_0, index_1, precision);
    return this.areCollinear(index_0, index_1, precision);
  }
}




/**
 * A ConstrainedMovementsSequence is a list of movements constrained by speed, acceleration and jerk
 */
export class ConstrainedMovementsSequence extends MovementsSequence {

  constructor(allocated?: number) {
    super(allocated, {
      'values': Float64Array,
      'speedLimits': Float64Array,
      'accelerationLimits': Float64Array,
      'jerkLimits': Float64Array
    });
  }

  /**
   * DEBUG
   */
  toString(index: number = -1, type: string = 'value'): string {
    if(index === -1) {
      let str: string = '';
      for(let i = 0, length = this.length; i < length; i++) {
        str += this.toString(i, type) + '\n';
      }
      return str;
    } else {
      switch(type) {
        case 'limits':
          return '( ' + this._buffers['speedLimits'][index] + ', ' + this._buffers['accelerationLimits'][index] + ', ' + this._buffers['jerkLimits'][index] + ' )';
        case 'value':
        default:
          return this._buffers['values'][index].toString();
      }
    }
  }

}


/**
 * A ConstrainedNormalizedMovementSequence is a ConstrainedMovementsSequence where all values are equals to 1
 */
export class ConstrainedNormalizedMovementSequence extends CorrelatedArrayBuffers {

  constructor(allocated?: number) {
    super(allocated, {
      'initialSpeeds': Float64Array,
      'finalSpeeds': Float64Array,
      'speedLimits': Float64Array,
      'accelerationLimits': Float64Array,
    });
  }

  /**
   * DEBUG
   */
  toString(index: number = -1, type: string = 'value'): string {
    if(index === -1) {
      let str: string = '';
      for(let i = 0, length = this.length; i < length; i++) {
        str += this.toString(i, type) + '\n';
      }
      return str;
    } else {
      switch(type) {
        case 'limits':
          return '( ' + this._buffers.speedLimits[index] + ', ' + this._buffers.accelerationLimits[index] + ' )';
        case 'speed':
        default:
          return '( ' + this._buffers.initialSpeeds[index] + ', ' + this._buffers.finalSpeeds[index] + ' )';
      }
    }
  }
}


/**
 * A ConstrainedSynchronizedMovementsSequence is list of synchronized movements
 * Its purpose it's to optimize its movements' sequences
 */
export class ConstrainedSynchronizedMovementsSequence extends SynchronizedMovementsSequence {
  // static DEFAULT_PRECISION = 1e-4;
  static DEFAULT_PRECISION = Float.EPSILON_32;

  public children: ConstrainedMovementsSequence[];

  constructor(numberOfParallelMovements: number) {
    super(0, {
      'indices': Uint32Array
    });

    for(let i = 0; i < numberOfParallelMovements; i++) {
      this.children[i] = new ConstrainedMovementsSequence();
    }
  }


  optimize(): OptimizedSynchronizedMovementsSequence {
    const normalizedMovesSequence: ConstrainedNormalizedMovementSequence = this._getNormalizedMovesSequence();

    this._optimizeTransitionSpeedsPass1(normalizedMovesSequence);

    //console.log(normalizedMovesSequence.toString(-1, 'speed'));

    this._optimizeTransitionSpeedsPass2(normalizedMovesSequence);

    // console.log(normalizedMovesSequence.toString(-1, 'speed'));

    return this._decompose(normalizedMovesSequence);
  }

  /**
   * Normalizes values of this sync movements sequences.
   * Normalized values are easier to work with
   * @returns {ConstrainedNormalizedMovementSequence}
   * @private
   */
  private _getNormalizedMovesSequence(): ConstrainedNormalizedMovementSequence {
    const movesSequence: ConstrainedNormalizedMovementSequence = new ConstrainedNormalizedMovementSequence();
    movesSequence.length = this._length;

    let move: ConstrainedMovementsSequence;
    let speedLimit: number, accelerationLimit: number, value: number;
    for(let i = 0, l = this._length; i < l; i++) {
      move = this.children[0];
      value = Math.abs(move._buffers['values'][i]);
      speedLimit = move._buffers['speedLimits'][i] / value;
      accelerationLimit = move._buffers['accelerationLimits'][i] / value;

      for(let j = 1, childrenLength = this.children.length; j < childrenLength; j++) {
        move = this.children[j];
        value = Math.abs(move._buffers['values'][i]);
        speedLimit = Math.min(speedLimit, move._buffers['speedLimits'][i] / value);
        accelerationLimit = Math.min(accelerationLimit, move._buffers['accelerationLimits'][i] / value);
      }

      // movesSequence.initialSpeeds[i]       = NaN;
      // movesSequence.finalSpeeds[i]         = NaN;
      movesSequence._buffers['speedLimits'][i]         = speedLimit;
      movesSequence._buffers['accelerationLimits'][i]  = accelerationLimit;
    }

    return movesSequence;
  }


  /**
   * Starts from the beginning of the sequence and optimizes transitions : as fast a possible with minimal jerk
   * At the end, the finalSpeed could be different thant 0
   * @param {ConstrainedNormalizedMovementSequence} normalizedMovesSequence
   * @private
   */
  private _optimizeTransitionSpeedsPass1(normalizedMovesSequence: ConstrainedNormalizedMovementSequence) {
    let initialSpeed: number;
    let accelerationLimit: number;
    let finalSpeedLimit: number;

    let matrix: Matrix;
    let solutions: Matrix;

    let i: number = 0;
    const length: number = normalizedMovesSequence._length - 1;
    normalizedMovesSequence._buffers['initialSpeeds'][i] = 0; // constraints initialSpeed to 0

    for(; i < length; i++) { // for each pair of movements
      initialSpeed      = normalizedMovesSequence._buffers['initialSpeeds'][i];
      accelerationLimit = normalizedMovesSequence._buffers['accelerationLimits'][i];

      // computes final speed limit:
      // takes the min between speedLimit and reached speed computed with the maximal acceleration
      finalSpeedLimit = Math.min(
        normalizedMovesSequence._buffers['speedLimits'][i],
        (accelerationLimit === 0) ?
          initialSpeed : Math.sqrt(initialSpeed * initialSpeed + 2 * accelerationLimit)
      );

      // build the maximization matrix
      matrix = this._getMaximizationMatrix(
        i, i + 1,
        finalSpeedLimit, Math.min(finalSpeedLimit, normalizedMovesSequence._buffers['speedLimits'][i + 1])
      );
      // get max final and initial speeds
      solutions = matrix.solveStandardMaximizationProblem(matrix).getStandardMaximizationProblemSolutions();

      normalizedMovesSequence._buffers['finalSpeeds'][i]        = solutions.values[0];
      normalizedMovesSequence._buffers['initialSpeeds'][i + 1]  = solutions.values[1];
    }
  }

  /**
   * Starts from the end of the sequence and optimizes transitions : as fast a possible with minimal jerk
   * @param {ConstrainedNormalizedMovementSequence} normalizedMovesSequence
   * @private
   */
  private _optimizeTransitionSpeedsPass2(normalizedMovesSequence: ConstrainedNormalizedMovementSequence) {
    let finalSpeed: number;
    let accelerationLimit: number;
    let initialSpeedLimit: number;

    let matrix: Matrix;
    let solutions: Matrix;

    let i: number = normalizedMovesSequence.length - 1;
    normalizedMovesSequence._buffers['finalSpeeds'][i] = 0;

    for(; i > 0; i--) {
      finalSpeed = normalizedMovesSequence._buffers['finalSpeeds'][i];
      accelerationLimit = normalizedMovesSequence._buffers['accelerationLimits'][i];

      // compute initial speed limit according to accelerationLimit and speedLimit
      initialSpeedLimit = Math.min(
        normalizedMovesSequence._buffers['speedLimits'][i],
        normalizedMovesSequence._buffers['initialSpeeds'][i],
        (accelerationLimit === 0) ?
          finalSpeed : Math.sqrt(finalSpeed * finalSpeed + 2 * accelerationLimit)
      );

      // build the maximization matrix
      matrix = this._getMaximizationMatrix(
        i - 1, i,
        Math.min(initialSpeedLimit, normalizedMovesSequence._buffers['finalSpeeds'][i - 1]), initialSpeedLimit,
      );
      // get max final and initial speeds
      solutions = matrix.solveStandardMaximizationProblem(matrix).getStandardMaximizationProblemSolutions();

      normalizedMovesSequence._buffers['finalSpeeds'][i - 1]  = solutions.values[0];
      normalizedMovesSequence._buffers['initialSpeeds'][i]    = solutions.values[1];
    }
  }


  /**
   * Builds a MaximizationMatrix between movements at index_0 and index_1 according to some speed limits (final and initial).
   * This matrix will be used to solve the best final and initial speeds :
   * (final speed of movement[index_0] and initial speed of movement[index_1])
   *
   * The problem, has this form:
   *  for each axis (i) :
   *    - abs(value[index_0][i] * finalSpeed - value[index_1][i] * initialSpeed) < jerk[i]
   *      => here 'abs' will be replaced by 2 rows instead:
   *        - (+value[index_0][i] * finalSpeed - value[index_1][i] * initialSpeed) < jerk[i]
   *        - (-value[index_0][i] * finalSpeed + value[index_1][i] * initialSpeed) < jerk[i]
 *        => this mean that the difference between final and initial speeds can't exceed jerk.
   *   set 2 maximum speeds: final and initial
   *
   * After solving the problem, the best final and initial speed will be returned
   *
   *
   * @param {number} index_0
   * @param {number} index_1
   * @param {number} finalSpeedLimit
   * @param {number} initialSpeedLimit
   * @returns {Matrix<Float64Array>}
   * @private
   */
  private _getMaximizationMatrix(index_0: number, index_1: number, finalSpeedLimit: number, initialSpeedLimit: number): Matrix<Float64Array> {
    // 2 per axes
    // + 2 for max values
    // + 1 for maximization
    const rowsNumber: number = this.children.length * 2 + 2 + 1;

    // D[i][0] * Ve - D[i][1] * Vi < J[i] => 3 columns
    const matrix: Matrix<Float64Array> = new Matrix<Float64Array>(rowsNumber, 3 + rowsNumber - 1).empty();

    let movesSequence: ConstrainedMovementsSequence;
    let row: number = 0;

    const col_1: number = matrix.m;
    const col_last: number = (matrix.n - 1) * matrix.m;
    let jerkLimit: number;
    let value_0: number, value_1: number;

    for(let i = 0, l = this.children.length; i < l; i++) { // for each axis
      movesSequence = this.children[i];

      jerkLimit = Math.min(
        movesSequence._buffers['jerkLimits'][index_0],
        movesSequence._buffers['jerkLimits'][index_1]
      ); //  * move_0.direction  * move_1.direction

      value_0 = movesSequence._buffers['values'][index_0];
      value_1 = movesSequence._buffers['values'][index_1];

      matrix.values[row] = value_0;
      matrix.values[row + col_1] = -value_1;
      matrix.values[row + col_last] = jerkLimit;
      row++;

      matrix.values[row] = -value_0;
      matrix.values[row + col_1] = value_1;
      matrix.values[row + col_last] = jerkLimit;
      row++;
    }

    matrix.values[row] = 1;
    // matrix.values[row + col_1] = 0;
    matrix.values[row + col_last] = finalSpeedLimit;
    row++;

    // matrix.values[row] = 0;
    matrix.values[row + col_1] = 1;
    matrix.values[row + col_last] = initialSpeedLimit;
    row++;

    matrix.values[row] = -1;
    matrix.values[row + col_1] = -1;

    for(let m = 0, l = matrix.m - 1; m < l; m++) {
      matrix.values[m + (m + 2) * matrix.m] = 1;
    }

    return matrix;
  }


  /**
   * Each movement, constrained by initial and final speed, must be split trying to its minimize execution time.
   * @param {ConstrainedNormalizedMovementSequence} normalizedMovesSequence
   * @param {number} precision
   * @returns {OptimizedSynchronizedMovementsSequence}
   * @private
   */
  private _decompose(normalizedMovesSequence: ConstrainedNormalizedMovementSequence, precision: number = 1e-12): OptimizedSynchronizedMovementsSequence {
    const movementsSequence: OptimizedSynchronizedMovementsSequence = new OptimizedSynchronizedMovementsSequence(this.children.length);
    movementsSequence.require(normalizedMovesSequence.length * 3); // each movement could be split in 3 moves at max
    let movementsSequenceLength: number = 0;

    let index: number;
    let initialSpeed: number, finalSpeed: number;
    let speedLimit: number, accelerationLimit: number;

    let ta: number, tb: number, t0: number, t1: number, t2: number;
    let v0_max: number;
    let d0: number, d1: number, d2: number;


    for(let i = 0, length = normalizedMovesSequence.length; i < length; i++) {
      index = this._buffers['indices'][i];

      initialSpeed = normalizedMovesSequence._buffers['initialSpeeds'][i];
      finalSpeed = normalizedMovesSequence._buffers['finalSpeeds'][i];
      speedLimit = normalizedMovesSequence._buffers['speedLimits'][i];
      accelerationLimit = normalizedMovesSequence._buffers['accelerationLimits'][i];

      // first we compute the point were we accelerate as fast as possible and decelerate as fast as possible
      // ta, tb => time to reach junction peak of full acceleration and deceleration
      // ta for acceleration, tb for deceleration
      ta =  (Math.sqrt(
          (initialSpeed * initialSpeed + finalSpeed * finalSpeed) / 2 +
          accelerationLimit /* * this.distance */
        ) - initialSpeed) / accelerationLimit;
      tb = ta + (initialSpeed - finalSpeed) / accelerationLimit;

      // t0, t1, t2 => times of the 3 decomposed children
      t0 = Math.min(ta, (speedLimit - initialSpeed) / accelerationLimit); // get full acceleration time according to the speed limit
      t2 = Math.min(tb, (speedLimit - finalSpeed) / accelerationLimit); // get full deceleration time according to the speed limit

      // max achieved speed
      v0_max = accelerationLimit * t0 + initialSpeed;
      // v1_max = this.accelerationLimit * t2 + this.finalSpeed;

      // d0, d1, d2 => distances of the 3 decomposed children
      d0 = 0.5 * accelerationLimit * t0 * t0 + initialSpeed * t0;
      d2 = 0.5 * accelerationLimit * t2 * t2 + finalSpeed * t2;
      d1 = 1 - d0 - d2;

      t1 = d1 / v0_max;


      // console.log('t=>', t0, t1, t2, ta, tb);
      // // console.log('v=>', v0_max, v1_max);
      // console.log('d=>', d0, d1, d2);
      // console.log('--');

      // acceleration
      if(!Float.isNull(t0, precision)) {
        // console.log('i', i, 'vi', initialSpeed, 'vf', finalSpeed, 'al', accelerationLimit);

        movementsSequence._buffers['indices'][movementsSequenceLength] = index;
        movementsSequence._buffers['times'][movementsSequenceLength] = t0;
        movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = initialSpeed / d0;
        movementsSequence._buffers['accelerations'][movementsSequenceLength] = accelerationLimit / d0;

        for(let j = 0, l = this.children.length; j < l; j++) {
          movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d0;
        }

        movementsSequenceLength++;
      }

      // linear
      if(!Float.isNull(t1, precision)) {
        movementsSequence._buffers['indices'][movementsSequenceLength] = index;
        movementsSequence._buffers['times'][movementsSequenceLength] = t1;
        movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = v0_max / d1;
        // movementsSequence.accelerations[movementsSequenceLength] = 0;

        for(let j = 0, l = this.children.length; j < l; j++) {
          movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d1;
        }

        movementsSequenceLength++;
      }

      // deceleration
      if(!Float.isNull(t2, precision)) {
        movementsSequence._buffers['indices'][movementsSequenceLength] = index;
        movementsSequence._buffers['times'][movementsSequenceLength] = t2;
        movementsSequence._buffers['initialSpeeds'][movementsSequenceLength] = v0_max / d2;
        movementsSequence._buffers['accelerations'][movementsSequenceLength] = -normalizedMovesSequence._buffers['accelerationLimits'][i] / d2;

        for(let j = 0, l = this.children.length; j < l; j++) {
          movementsSequence.children[j]._buffers['values'][movementsSequenceLength] = this.children[j]._buffers['values'][i] * d2;
        }

        movementsSequenceLength++;
      }

    }

    movementsSequence.length = movementsSequenceLength;
    // console.log(movementsSequence.toString());

    return movementsSequence;
  }


  areCorrelated(index_0: number, index_1: number, precision: number = ConstrainedSynchronizedMovementsSequence.DEFAULT_PRECISION): boolean {
    if(this.isNull(index_0) || this.isNull(index_1)) {
      return true;
    }

    if(!this.areCollinear(index_0, index_1, precision)) {
      return false;
    }

    let movesSequence: ConstrainedMovementsSequence;
    for(let i = 0; i < this.children.length; i++) {
      movesSequence = this.children[i];
      if(
        !Float.equals(movesSequence._buffers['speedLimits'][index_0], movesSequence._buffers['speedLimits'][index_1], precision) ||
        !Float.equals(movesSequence._buffers['accelerationLimits'][index_0], movesSequence._buffers['accelerationLimits'][index_1], precision) ||
        !Float.equals(movesSequence._buffers['jerkLimits'][index_0], movesSequence._buffers['jerkLimits'][index_1], precision)
      ) {
        return false;
      }
    }

    return true;
  }

  toString(index: number = -1, type: string = 'values'): string {
    if(index === -1) {
      let str: string = '';
      for(let i = 0, length = Math.min(10, this.length); i < length; i++) {
        str += this.toString(i, type) + '\n\n---\n\n';
      }
      return str;
    } else {
      switch(type) {
        case 'values':
          // return (<ConstrainedMovementsSequence[]>this.children).map((move: ConstrainedMovementsSequence) => {
          //   return move.toString(index, 'value');
          // }).join(', ');
          return '(' + this._buffers.indices[index] + ') => ' +
            this.children.map((move: ConstrainedMovementsSequence) => {
              // return move.toString(index);
              return '\n{ ' +
                'value: ' + move._buffers.values[index] +
                ', speed: ' + move._buffers.speedLimits[index] +
                ', accel: ' + move._buffers.accelerationLimits[index] +
                ', jerk: ' +  move._buffers.jerkLimits[index] +
                ' }';
            }).join(',\n');
        case 'limits':
          return this.children.map((move: ConstrainedMovementsSequence) => {
            return move.toString(index, 'limits');
          }).join(', ');
        default:
          throw new RangeError('Invalid type');
      }
    }
  }

}



export class OptimizedMovementsSequence extends MovementsSequence {
  constructor(allocated?: number) {
    super(allocated, {
      'values': Float64Array
    });
  }
}

export class OptimizedSynchronizedMovementsSequence extends SynchronizedMovementsSequence {
  public children: OptimizedMovementsSequence[];

  constructor(numberOfParallelMovements: number) {
    super(0, {
      'indices': Uint32Array,
      'times': Float64Array,
      'initialSpeeds': Float64Array,
      'accelerations': Float64Array
    });

    for(let i = 0; i < numberOfParallelMovements; i++) {
      this.children[i] = new OptimizedMovementsSequence();
    }
  }

  areCorrelated(index_0: number, index_1: number, precision: number = ConstrainedSynchronizedMovementsSequence.DEFAULT_PRECISION): boolean {
    if(this.isNull(index_0) || this.isNull(index_1)) {
      return true;
    }

    if(
      !Float.equals(this._buffers['times'][index_0], this._buffers['times'][index_1], precision) ||
      !Float.equals(this._buffers['initialSpeeds'][index_0], this._buffers['initialSpeeds'][index_1], precision) ||
      !Float.equals(this._buffers['accelerations'][index_0], this._buffers['accelerations'][index_1], precision)
    ) {
      return false;
    }

    if(!this.areCollinear(index_0, index_1, precision)) {
      return false;
    }

    return true;
  }

  toStepperMovementsSequence(): StepperMovementsSequence {
    const movementsSequence = new StepperMovementsSequence(this.children.length);
    movementsSequence.length = this._length;

    for(let i = 0; i < this.children.length; i++) {
      this.children[i].roundValues(movementsSequence.children[i]._buffers.values);
    }

    for(let i = 0; i < this._length; i++) {
      movementsSequence._buffers.times[i] = this._buffers.times[i];
      movementsSequence._buffers.initialSpeeds[i] = this._buffers.initialSpeeds[i];
      movementsSequence._buffers.accelerations[i] = this._buffers.accelerations[i];
    }

    return movementsSequence;
  }


  /**
   * DEBUG
   */
  toString(type: string = 'values', start: number = 0, end: number = this._length): string {
    let str: string = '';

    for(let i = start, length = end; i < length; i++) {
      switch(type) {
        case 'values':
          str += '(' + this._buffers.indices[i] + ') ' + 'time: ' + this._buffers.times[i] + ' => ' +
            this.children.map((move: OptimizedMovementsSequence) => {
              // return move.toString(index);
              let value = move._buffers.values[i];
              return '{ ' +
                'value: ' + value +
                ', speed: ' + this._buffers.initialSpeeds[i] +
                ', accel: ' + this._buffers.accelerations[i] +
                ' }';
            }).join(', ');
          break;
        case 'times':
          str += 'time: ' + this._buffers.times[i] + ' => ' +
            this.children.map((move: OptimizedMovementsSequence) => {
              // return move.toString(index);
              let value = move._buffers.values[i];
              let computed = 0.5 * this._buffers.accelerations[i] * this._buffers.times[i] * this._buffers.times[i] + this._buffers.initialSpeeds[i] * this._buffers.times[i];
              return '{ ' +
                'value: ' + value +
                ', computed: ' + computed * value +
                ' }' + (Float.equals(computed, 1, 1e-9)? '' : '=>>>>>>>>[ERROR]');
            }).join(', ');
          break;
      }

      str += '\n----\n';
    }
    return str;
  }

}





// not used

export class StepperMovesSequence extends CorrelatedArrayBuffers {
  constructor(allocated?: number) {
    super(allocated, {
      'values': Int32Array,
      'positions': Uint32Array,
    });
  }
}

export class StepperMovementsSequence extends CorrelatedArrayBuffersTree {
  public children: StepperMovesSequence[] = [];

  constructor(numberOfParallelMoves: number) {
    super(0, {
      'times': Float64Array,
      'initialSpeeds': Float64Array,
      'accelerations': Float64Array
    });

    for(let i = 0; i < numberOfParallelMoves; i++) {
      this.children[i] = new StepperMovesSequence(this._allocated);
    }
  }

  reduce() {
    let writeIndex: number = 0;
    for(let i = 0; i < this._length; i++) {
      if(!this.isNull(i)) {
        this.move(writeIndex, i);
        writeIndex++;
      }
    }
    this.length = writeIndex;
  }

  isNull(index: number): boolean {
    for(let i = 0; i < this.children.length; i++) {
      if(this.children[i]._buffers.values[index] !== 0) {
        return false;
      }
    }
    return true;
  }


  /**
   * DEBUG
   */
  toString(index: number = -1, type: string = 'values'): string {
    if(index === -1) {
      let str: string = '';
      for(let i = 0, length = Math.min(30, this.length); i < length; i++) {
        str += this.toString(i, type) + '\n----\n';
      }
      return str;
    } else {
      switch(type) {
        case 'values':
          return 'time: ' + this._buffers.times[index] + ' => ' +
            this.children.map((move: StepperMovesSequence) => {
              // return move.toString(index);
              let value = move._buffers.values[index];
              return '{ ' +
                'value: ' + value +
                ', speed: ' + value * this._buffers.initialSpeeds[index] +
                ', accel: ' + value * this._buffers.accelerations[index] +
                ' }';
            }).join(', ');
        case 'times':
          return 'time: ' + this._buffers.times[index] + ' => ' +
            this.children.map((move: StepperMovesSequence) => {
              // return move.toString(index);
              let value = move._buffers.values[index];
              let computed = 0.5 * this._buffers.accelerations[index] * this._buffers.times[index] * this._buffers.times[index] + this._buffers.initialSpeeds[index] * this._buffers.times[index];
              return '{ ' +
                'value: ' + value +
                ', computed: ' + computed * value +
                ' }' + (Float.equals(computed, 1, 1e-9)? '' : '=>>>>>>>>[ERROR]');
            }).join(', ');
        default:
          return '';
      }
    }
  }

}

