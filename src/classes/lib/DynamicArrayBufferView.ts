export type Constructor<T> = new(...args: any[]) => T;

export type ArrayBufferView = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

export enum CompareResult {
  EQUAL,
  GREATER,
  LESS
}


export type ReallocChunk = [number, number, number];



export class DynamicArrayBufferView<T extends ArrayBufferView = Uint8Array> {

  public static OOR: number = -1; // Out Of Range

  protected _buffer: T;
  protected _start: number;
  protected _end: number;
  protected _startLimit: number;
  protected _endLimit: number;

  constructor(input: (DynamicArrayBufferView<T> | T) = (new Uint8Array(0) as T)) {
    if(input !== null) this.set(input);
  }

  getMargins(size: number): [number, number] {
    return [Math.max(Math.round(size * 0.1), 10), Math.max(Math.round(size * 0.2), 10)];
  }


  get type(): Constructor<T> {
    return this._buffer.constructor as Constructor<T>;
  }

  get allocated(): number {
    return this._buffer.length;
  }

  get length(): number {
    return this._end - this._start;
  }

  // set length(value: number) {
  //   if(value > this.length) {
  //     this.expand(this.length, value - this.length);
  //   }
  // }

  get typedArray(): T {
    return this._buffer.subarray(this._start, this._end) as T;
  }

  set typedArray(array: T) {
    this.set(array);
  }


  set(array: DynamicArrayBufferView<T> | T): void {
    if(array instanceof DynamicArrayBufferView) {
      return this.set(array.typedArray);
    } else if(ArrayBuffer.isView(array)) {
      this._buffer = array;
      this._start = 0;
      this._end = this._buffer.length;

      const [startMargin, endMargin] = this.getMargins(array.length);
      this._startLimit = this._start + startMargin;
      this._endLimit = this._end - endMargin;
    } else {
      throw new TypeError('Expected ArrayBufferView');
    }
  }

  getAt(index: number): number {
    if((index < 0) || (index >= this.length)) throw new RangeError('Index out of range');
    return this._buffer[this._start + index];
  }

  setAt(index: number, value: number): void {
    if((index < 0) || (index >= this.length)) throw new RangeError('Index out of range');
    this._buffer[this._start + index] = value;
  }


  empty(): void {
    this.set(new (this.type)(0));
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  compact(): void {
    this.set(this.typedArray);
  }


  /**
   * MUTATIONS
   */

  /**
   * Push one element at the end of this array
   * @param {number} value
   */
  push(value: number): void {
    const newEnd: number = this._end + 1;
    if(newEnd > this._buffer.length) {
      this._expand(this._end - this._start, 1);
    } else {
      this._end = newEnd;
    }
    this._buffer[this._end - 1] = value;
  }

  /**
   * Remove and return the last element of this array
   * Opposite of push
   * @returns {number}
   */
  pop(): number {
    const newEnd: number = this._end - 1;
    const value: number = this._buffer[newEnd];
    if(newEnd < this._endLimit) {
      this._expand(this._end - this._start, -1);
    } else {
      this._end = newEnd;
    }
    return value;
  }

  /**
   * Append 'array' at the end of this array
   * @param {DynamicArrayBufferView<T> | T} array
   */
  append(array: DynamicArrayBufferView<T> | T): void {
    if(array instanceof DynamicArrayBufferView) {
      return this.append(array.typedArray);
    } else if(ArrayBuffer.isView(array)) {
      const length: number = array.length;
      const newEnd: number = this._end + length;
      if(newEnd > this._buffer.length) {
        this._expand(this._end - this._start, length);
      } else {
        this._end = newEnd;
      }

      for(let i = 0, offset = this._end - length; i < length; i++) {
        this._buffer[i + offset] = array[i];
      }
    } else {
      throw new TypeError('Expected ArrayBufferView');
    }
  }

  /**
   * Remove and put 'array.length' values into 'array' from the end of this array
   * Opposite of append
   * @param {DynamicArrayBufferView<T> | T} array
   * @returns {DynamicArrayBufferView<T>}
   */
  subtract(array: DynamicArrayBufferView<T> | T): DynamicArrayBufferView<T> {
    if(array instanceof DynamicArrayBufferView) {
      return this.subtract(array.typedArray);
    } else {
      const length: number = array.length;
      const newEnd: number = this._end - length;

      for(let i = 0, offset = this._end - length; i < length; i++) {
        array[i] = this._buffer[i + offset];
      }

      if(newEnd < this._endLimit) {
        this._expand(this._end - this._start, -length);
      } else {
        this._end = newEnd;
      }
      return new DynamicArrayBufferView<T>(array);
    }
  }


  /**
   * Push one element at the start of this array
   * @param {number} value
   */
  unshift(value: number): void {
    const newStart: number = this._start - 1;
    if(newStart < 0) {
      this._expand(0, 1);
    } else {
      this._start = newStart;
    }
    this._buffer[this._start] = value;
  }

  /**
   * Remove and return the first element of this array
   * Opposite of unshift
   * @returns {number}
   */
  shift(): number {
    const newStart: number = this._start + 1;
    const value: number = this._buffer[this._start];
    if(newStart > this._startLimit) {
      this._expand(0, -1);
    } else {
      this._start = newStart;
    }
    return value;
  }

  /**
   * Append 'array' at the start of this array
   * @param {DynamicArrayBufferView<T> | T} array
   */
  prepend(array: DynamicArrayBufferView<T> | T): void {
    if(array instanceof DynamicArrayBufferView) {
      return this.prepend(array.typedArray);
    } else {
      const length: number = array.length;
      const newStart: number = this._start - length;
      if(newStart < 0) {
        this._expand(0, length);
      } else {
        this._start = newStart;
      }

      for(let i = 0; i < length; i++) {
        this._buffer[i + this._start] = array[i];
      }
    }
  }

  /**
   * Remove and put 'array.length' values into 'array' from the start of this array
   * Opposite of prepend
   * @param {DynamicArrayBufferView<T> | T} array
   * @returns {DynamicArrayBufferView<T>}
   */
  presubtract(array: DynamicArrayBufferView<T> | T): DynamicArrayBufferView<T> {
    if(array instanceof DynamicArrayBufferView) {
      return this.presubtract(array.typedArray);
    } else {
      const length: number = array.length;
      const newStart: number = this._start + length;

      for(let i = 0; i < length; i++) {
        array[i] = this._buffer[i + this._start];
      }

      if(newStart > this._startLimit) {
        this._expand(0, -length);
      } else {
        this._start = newStart;
      }
      return new DynamicArrayBufferView<T>(array);
    }
  }


  // overwrite(start: number, end: number, array: DynamicArrayBufferView<T> | T): DynamicArrayBufferView<T> {
  //   if(array instanceof DynamicArrayBufferView) {
  //     return this.presubtract(array.typedArray);
  //   } else {
  //     const length: number = array.length;
  //     const newStart: number = this._start + length;
  //
  //     for(let i = 0; i < length; i++) {
  //       array[i] = this._buffer[i + this._start];
  //     }
  //
  //     if(newStart > this._startLimit) {
  //       this._expand(0, -length);
  //     } else {
  //       this._start = newStart;
  //     }
  //     return new DynamicArrayBufferView<T>(array);
  //   }
  // }



  /**
   * Expand/Remove a portion of this array
   * @param {number} offset - the offset where to start
   * @param {number} shift - shift data. No data are shifted before offset
   * @param {number | null} fillWith
   * @example
   *  - expands of 3 empty bytes at offset 2 => expand(2, 3)
   *  - removes 3 bytes at offset 2 (equivalent of array.splice(2, 3)) => expand(2, -3)
   */
  expand(offset: number, shift: number, fillWith: (number | null) = null): void {
    if(offset < 0) offset += this.length;
    offset = Math.min(Math.max(offset, 0), this.length);
    if(shift < 0) shift = Math.max(shift, -(this.length - offset));
    // console.log('expand', offset, shift);

    // const _leftShift: number = offset;
    // const _rightShift: number = this._end - this._start - offset + Math.min(shift, 0);

    // console.log(_leftShift, _rightShift);

    // if(_leftShift < _rightShift) {
    if(offset < (this.length - offset + Math.min(shift, 0))) {
      const newStart: number = this._start - shift;
      if((newStart < 0) || (newStart > this._startLimit)) { // require reallocation
        this._expand(offset, shift, fillWith);
      } else {
        const end: number = this._start + offset;
        this._shift(-shift, this._start, end);
        this._start = newStart;

        if(fillWith !== null) {
          for(let i = end - shift; i < end; i++) {
            this._buffer[i] = fillWith;
          }
        }
      }
    } else {
      const newEnd: number = this._end + shift;
      if((newEnd > this._buffer.length) || (newEnd < this._endLimit)) { // require reallocation
        this._expand(offset, shift, fillWith);
      } else { // no reallocation required
        const start: number = this._start + offset - Math.min(shift, 0);
        this._shift(shift, start, this._end);
        this._end = newEnd;

        if(fillWith !== null) {
          for(let i = start, l = start + shift; i < l; i++) {
            this._buffer[i] = fillWith;
          }
        }
      }
    }
  }


  /**
   * OPERATIONS
   */

  /**
   * Concat current array with another array. Return a new dynamic array.
   * For faster performances, prefer :
   *  array = new DynamicArray<T>(T, allocated);
   *  for loop on array.typedArray
   * @param {DynamicArrayBufferView<T> | T} array
   * @returns {DynamicArrayBufferView<T>}
   */
  concat(array: DynamicArrayBufferView<T> | T): DynamicArrayBufferView<T> {
    if(array instanceof DynamicArrayBufferView) {
      return this.concat(array.typedArray);
    } else {
      const length1: number = this._end - this._start;
      const length2: number = array.length;
      const buffer: T = new (this.type)(length1 + length2);
      for(let i = 0; i < length1; i++) buffer[i] = this._buffer[this._start + i];
      for(let i = 0; i < length2; i++) buffer[length1 + i] = array[i];
      return new DynamicArrayBufferView<T>(buffer);
    }
  }


  /**
   * Fill array with 'value' from 'start' to 'end'
   * @param {number} value
   * @param {number} start
   * @param {number} end
   * @returns {this}
   */
  fill(value: number, start: number = 0, end: number = this.length): this {
    start = Math.max(start, 0) + this._start;
    end = Math.min(end, this.length) + this._start;
    for(let i = start; i < end; i++) this._buffer[i] = value;
    return this;
  }


  slice(start: number = 0, end: number = this.length): DynamicArrayBufferView<T> {
    if(start < 0) start += this.length;
    start = Math.min(Math.max(start, 0), this.length);
    if(end < 0) end += this.length;
    end = Math.min(Math.max(end, start), this.length);

    const buffer: T = new (this.type)(end - start);
    for(let i = 0, l = end - start, o = this._start + start; i < l; i++) {
      buffer[i] = this._buffer[i + o];
    }

    return new DynamicArrayBufferView<T>(buffer);
  }

  repeat(count: number): DynamicArrayBufferView<T> {
    if((count < 0) || !Number.isFinite(count)) throw new RangeError('Count must be in range [ 0, +∞[');

    const buffer: T = new (this.type)(this.length * count);

    let k: number = 0;
    for(let i = 0; i < count; i++) {
      for(let j = this._start; j < this._end; j++) {
        buffer[k++] = this._buffer[j];
      }
    }

    return new DynamicArrayBufferView<T>(buffer);
  }

  trimLeft(length: number): this {
    length = Math.min(Math.max(length, 0), this.length);
    this.expand(0, -length);
    return this;
  }

  trimRight(length: number): this {
    length = Math.min(Math.max(length, 0), this.length);
    this.expand(this.length - length, -length);
    return this;
  }

  trim(start: number, end: number): this {
    start = Math.min(Math.max(start, 0), this.length); // [0 -> length]
    end = Math.min(Math.max(end, 0), this.length - start); // [0 -> remaining space]

    const newStart: number = this._start + start;
    const newEnd: number = this._end - end;

    if((newStart > this._startLimit) || (newEnd < this._endLimit)) {
      this._trim(newStart, newEnd);
    } else {
      this._start = newStart;
      this._end = newEnd;
    }
    return this;
  }

  padStart(length: number, array: (DynamicArrayBufferView<T>) | T = new (this.type)([0])): this {
    if(array instanceof DynamicArrayBufferView) {
      return this.padStart(length, array.typedArray);
    } else {
      const d: number = length - this.length;
      if(d > 0) {
        this.expand(0, d);
        for(let i = 0, arrayLength = array.length; i < d; i++) {
          this._buffer[this._start + i] = array[i % arrayLength];
        }
      }
      return this;
    }
  }

  padEnd(length: number, array: (DynamicArrayBufferView<T>) | T = new (this.type)([0])): this {
    if(array instanceof DynamicArrayBufferView) {
      return this.padEnd(length, array.typedArray);
    } else {
      const oldLength: number = this.length;
      const d: number = length - oldLength;
      if(d > 0) {
        this.expand(oldLength, d);
        for(let i = 0, arrayLength = array.length, o = this._start + oldLength; i < d; i++) {
          this._buffer[o + i] = array[i % arrayLength];
        }
      }
      return this;
    }
  }

  reverse(): this {
    let swap: number;
    for(
      let i = this._start,
        a = this._start + this._end,
        l = a / 2,
        o = a - 1
      ; i < l; i++) {

      swap = this._buffer[i];
      this._buffer[i] = this._buffer[o - i];
      this._buffer[o - i] = swap;
    }
    return this;
  }

  indexOf(value: number, offset: number = 0): number {
    if(offset < 0) offset += this.length;
    offset = Math.min(Math.max(offset, 0), this.length);
    offset += this._start;

    for(let i = offset; i < this._end; i++) {
      if(this._buffer[i] === value) return (i - this._start);
    }

    return DynamicArrayBufferView.OOR;
  }

  indexOfSequence(array: DynamicArrayBufferView<T> | T, offset: number = 0): number {
    if(array instanceof DynamicArrayBufferView) {
      return this.indexOfSequence(array.typedArray, offset);
    } else {
      if(offset < 0) offset += this.length;
      offset = Math.min(Math.max(offset, 0), this.length);
      if((this.length - offset) < array.length) return -1; // not enough remaining space
      offset += this._start;

      const length: number = array.length;

      let j: number;
      for(let i = offset; i < this._end; i++) {
        for(j = 0; j < length; j++) {
          // console.log('comp', this._buffer[i + j], array[j]);
          if(this._buffer[i + j] !== array[j]) break;
        }
        if(j === length) return (i - this._start);
      }

      return DynamicArrayBufferView.OOR;
    }
  }

  includes(value: number, offset: number = 0): boolean {
    return this.indexOf(value, offset) !== DynamicArrayBufferView.OOR;
  }

  includesSequence(array: DynamicArrayBufferView<T> | T, offset: number = 0): boolean {
    return this.indexOfSequence(array, offset) !== DynamicArrayBufferView.OOR;
  }


  /**
   * COMPARISON
   */

  compare(array: DynamicArrayBufferView<T> | T): CompareResult {
    if(array instanceof DynamicArrayBufferView) {
      return this.compare(array.typedArray);
    } else {
      let a: number, b: number;
      let length = this._end - this._start;
      for(let i = 0, l = Math.min(length, array.length); i < l; i++) {
        a = array[i];
        b = this._buffer[this._start + i];
        if(a < b) {
          return CompareResult.GREATER;
        } else if(a > b) {
          return CompareResult.LESS;
        }
      }

      if(length > array.length) {
        return CompareResult.GREATER;
      } else if(length < array.length) {
        return CompareResult.LESS;
      } else {
        return CompareResult.EQUAL;
      }
    }
  }

  equals(array: DynamicArrayBufferView<T> | T): boolean {
    if(array instanceof DynamicArrayBufferView) {
      return this.equals(array.typedArray);
    } else {
      if(array.length !== this.length) return false;
      for(let i = 0, l = array.length; i < l; i++) {
        if(array[i] !== this._buffer[this._start + i]) return false;
      }
      return true;
    }
  }

  greaterThan(array: DynamicArrayBufferView<T> | T): boolean {
    return (this.compare(array) === CompareResult.GREATER);
  }

  greaterThanOrEquals(array: DynamicArrayBufferView<T> | T): boolean {
    const result: CompareResult = this.compare(array);
    return (result === CompareResult.GREATER) || (result === CompareResult.EQUAL);
  }

  lessThan(array: DynamicArrayBufferView<T> | T): boolean {
    return (this.compare(array) === CompareResult.LESS);
  }

  lessThanOrEquals(array: DynamicArrayBufferView<T> | T): boolean {
    const result: CompareResult = this.compare(array);
    return (result === CompareResult.LESS) || (result === CompareResult.EQUAL);
  }


  startsWith(array: DynamicArrayBufferView<T> | T, position: number = 0): boolean {
    if(array instanceof DynamicArrayBufferView) {
      return this.startsWith(array.typedArray, position);
    } else {
      position = Math.min(this.length, Math.max(0, position));
      if((this.length - position) < array.length) return false;
      position += this._start;
      for(let i = 0, l = array.length; i < l; i++) {
        if(array[i] !== this._buffer[i + position]) return false;
      }
      return true;
    }
  }

  endsWith(array: DynamicArrayBufferView<T> | T, position: number = this.length): boolean {
    if(array instanceof DynamicArrayBufferView) {
      return this.endsWith(array.typedArray, position);
    } else {
      position = Math.min(this.length, Math.max(0, position));
      if(position < array.length) return false;
      const offset1: number = array.length - 1;
      const offset2: number = position + this._start - 1;
      for(let i = 0; i < array.length; i++) {
        if(array[offset1 - i] !== this._buffer[offset2 - i]) return false;
      }
      return true;
    }
  }


  /**
   * GENERICS
   */


  clone(): DynamicArrayBufferView<T> {
    return new DynamicArrayBufferView<T>(this.typedArray.slice() as T);
  }


  // push2(value: number) {
  //   this.realloc(this.length + 1, [[0, this.length, 0]]);
  //   this._buffer[this._end - 1] = value;
  // }
  //
  // /**
  //  * length = new length of the array,
  //  * chunks = Array of [IndexSource, LengthSource, IndexDestination]
  //  */
  // realloc(length: number, chunks: ReallocChunk[]): void {
  //   let chunk: ReallocChunk;
  //
  //   let largestChunk: ReallocChunk = chunks[0];
  //   for(let i = 1, l = chunks.length; i < l; i++) {
  //     chunk = chunks[i];
  //     if(chunk[1] > largestChunk[1]) largestChunk = chunk;
  //   }
  //
  //   console.log(largestChunk);
  //
  //   // for(let i = 0, l = allocations.length; i < l; i++) {
  //   //   allocation = allocations[i];
  //   //   shiftCost =
  //   // }
  // }


  /**
   * Expand/Remove a portion of this array from the inside by reallocating and moving data
   * [x, x, +, +, +, x, x] | [x, x, +, +]
   */
  private _expand(offset: number, shift: number, fillWith: (number | null) = null): void {
    // console.log('_expand', offset, shift);

    const oldLength: number = this._end - this._start;
    const newLength: number = oldLength + shift; // length of the current array + expanded length
    let [startMargin, endMargin] = this.getMargins(newLength);

    const _buffer: T = new (this.type)(startMargin + newLength + endMargin); // allocate with some margins

    for(let i = this._start, l = this._start + offset, o = startMargin - this._start; i < l; i++) { // copy all the bytes before index
      _buffer[i + o] = this._buffer[i];
    }

    for(
      let i = this._start + offset - Math.min(shift, 0),
        l = this._start + oldLength,
        o = startMargin + shift - this._start
      ; i < l; i++) { // copy all the bytes after index + an offset
      _buffer[i + o] = this._buffer[i];
    }


    if(fillWith !== null) {
      for(let i = startMargin + offset, l = i + shift; i < l; i++) { // fill empty bytes with fillWith
        _buffer[i] = fillWith;
      }
    }

    this._buffer = _buffer;
    this._start = startMargin;
    this._end = this._start + newLength;
    this._startLimit = this._start + startMargin;
    this._endLimit = this._end - endMargin;
  }

  /**
   * Remove a portion of this array from the outside by reallocating and moving data
   */
  // TODO think about negative start to allow an expand
  private _trim(start: number, end: number): void {
    // console.log('_trim', start, end);

    const newLength: number = end - start;
    let [startMargin, endMargin] = this.getMargins(newLength);

    const _buffer: T = new (this.type)(startMargin + newLength + endMargin);
    for(let i = start, o = startMargin - start; i < end; i++) {
      _buffer[i + o] = this._buffer[i];
    }

    this._buffer = _buffer;
    this._start = startMargin;
    this._end = this._start + newLength;
    this._startLimit = this._start + startMargin;
    this._endLimit = this._end - endMargin;
  }

  // INFO https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Array/copyWithin
  private _shift(offset: number, start: number, end: number) {
    // console.log('_shift', offset, start, end);

    if(offset < 0) {
      for(let i = start; i < end; i++) {
        this._buffer[i + offset] = this._buffer[i];
      }
    } else if(offset > 0) {
      for(let i = end - 1; i >= start; i--) {
        this._buffer[i + offset] = this._buffer[i];
      }
    }
  }


  debug() {
    console.log(this._buffer, this._start, this._end);
  }
}


// function test() {
//   const array = new DynamicArrayBufferView(new Uint8Array([1, 2, 3]));
//   console.log(array);
//
//   array.push2(4);
// }
//
// test();



