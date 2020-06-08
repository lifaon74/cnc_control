import { TArrayBufferView } from '../types/array-buffer-view';
import { CyclicRange, NormalizeCyclicIndex } from '../classes/cyclic/CyclicRange';

export class CyclicTypedVectorArray2<TArray extends TArrayBufferView> {
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

  read(output?: TArray): TArray {
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

  write(input: TArray): void {
    if (input.length === this.vectorLength) {
      const index: number = this.range.end;
      // if (this.readable() === 0) {
      //   this.range.shiftStart(this.vectorLength);
      // }
      this.range.shiftEnd(this.vectorLength);
      this.array.set(input, index);
    } else {
      throw new Error(`Expected an input with length: ${ this.vectorLength }`);
    }
  }

  item(index: number): TArray {
    index = NormalizeCyclicIndex(index, this.readable());
    const _index: number = NormalizeCyclicIndex(this.range.start + (index * this.vectorLength), this.range.size);
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
