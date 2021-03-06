import { TArrayBufferView } from '../../types/array-buffer-view';
import { CyclicRange, NormalizeCyclicIndex } from './CyclicRange';

export class CyclicTypedVectorArray<TArray extends TArrayBufferView> {
  public array: TArray;
  public vectorLength: number;
  public range: CyclicRange;

  constructor(array: TArray, vectorLength: number) {
    this.array = array;
    this.vectorLength = vectorLength;
    this.range = new CyclicRange(this.array.length);
  }

  readable(): number {
    return this.range.startToEnd() / this.vectorLength;
  }

  writable(): number {
    return this.range.endToStart() / this.vectorLength;
  }

  /**
   * Pushes 'input' before the first element of the array
   */
  unshift(input: TArray): void {
    if (input.length === this.vectorLength) {
      this.range.shiftStart(-this.vectorLength);
      this.array.set(input, this.range.start);
    } else {
      throw new Error(`Expected an input with length: ${ this.vectorLength }`);
    }
  }

  /**
   * Removes and returns the first element of the vector array
   */
  shift(output?: TArray): TArray {
    const index: number = this.range.start;
    this.range.shiftStart(this.vectorLength);
    const data: TArray = this.array.subarray(index, index + this.vectorLength) as TArray;
    if (output === void 0) {
      return data;
    } else {
      output.set(data);
      return output;
    }
  }


  /**
   * Pushes 'input' after the last element of the array
   */
  push(input: TArray): void {
    if (input.length === this.vectorLength) {
      const index: number = this.range.end;
      this.range.shiftEnd(this.vectorLength);
      this.array.set(input, index);
    } else {
      throw new Error(`Expected an input with length: ${ this.vectorLength }`);
    }
  }

  /**
   * Removes and returns the last element of the vector array
   */
  pop(output?: TArray): TArray {
    this.range.shiftEnd(-this.vectorLength);
    const data: TArray = this.array.subarray(this.range.start, this.range.start + this.vectorLength) as TArray;
    if (output === void 0) {
      return data;
    } else {
      output.set(data);
      return output;
    }
  }

  getRelativeIndex(index: number): number {
    const readable: number = this.readable();
    if (readable > 0) {
      return this.range.start + (NormalizeCyclicIndex(index, readable) * this.vectorLength);
    } else {
      throw new Error(`Empty array`);
    }
  }

  item(index: number): TArray {
    const _index: number = this.getRelativeIndex(index);
    return this.array.subarray(_index, _index + this.vectorLength) as TArray;
  }

  reset(): void {
    this.range.reset();
  }

  toTypedArray(array?: TArray): TArray {
    const size: number = this.range.startToEnd();
    let _array: TArray;
    if (array === void 0) {
      _array = new (this.array.constructor as any)(size);
    } else if (array.length >= size) {
      _array = array;
    } else {
      throw new Error(`Requires bigger array.`);
    }

    if (this.range.startBeforeEnd) {
      _array.set(this.array.subarray(this.range.start, this.range.end));
    } else {
      _array.set(this.array.subarray(this.range.start, this.range.size));
      _array.set(this.array.subarray(0, this.range.end), this.range.size - this.range.start);
    }
    return (_array.length > size)
      ? _array.subarray(0, size) as TArray
      : _array;
  }
}
