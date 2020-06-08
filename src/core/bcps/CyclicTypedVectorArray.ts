import { CyclicIndex } from './CyclicIndex';
import { TArrayBufferView } from '../../types/array-buffer-view';

export class CyclicTypedVectorArray<TArray extends TArrayBufferView> {
  public array: TArray;
  public vectorLength: number;
  public index: CyclicIndex;

  constructor(array: TArray, vectorLength: number) {
    this.array = array;
    this.vectorLength = vectorLength;
    this.index = new CyclicIndex(this.array.length);
  }

  readable(): number {
    return this.index.readable();
  }

  writable(): number {
    return this.index.writable();
  }

  read(output?: TArray): TArray {
    const index: number = this.index.readIndex;
    this.index.read(this.vectorLength);
    const data: TArray = this.array.subarray(index, index + this.vectorLength) as TArray;
    if (output === void 0) {
      return data;
    } else {
      output.set(data);
      return output;
    }
  }

  write(input: TArray, force?: boolean): void {
    if (input.length === this.vectorLength) {
      const index: number = this.index.writeIndex;
      this.index.write(this.vectorLength, force);
      this.array.set(input, index);
    } else {
      throw new Error(`Expected an input with length: ${ this.vectorLength }`);
    }
  }

  item(index: number): TArray {
    const _index: number = this.index.relativeReadIndex(index * this.vectorLength);
    return this.array.subarray(_index, _index + this.vectorLength) as TArray;
  }

  reset(): void {
    this.index.reset();
  }

  toTypedArray(array?: TArray): TArray {
    const readable: number = this.readable();
    let _array: TArray;
    if (array === void 0) {
      _array = new (this.array.constructor as any)(readable);
    } else if (array.length >= readable) {
      _array = array;
    } else {
      throw new Error(`Requires bigger array.`);
    }

    if (this.index.writeIndex >= this.index.readIndex) {
      _array.set(this.array.subarray(this.index.readIndex, this.index.writeIndex));
    } else {
      _array.set(this.array.subarray(this.index.readIndex, this.index.length));
      _array.set(this.array.subarray(0, this.index.writeIndex), this.index.length - this.index.readIndex);
    }
    return (_array.length > readable)
      ? _array.subarray(0, readable) as TArray
      : _array;
  }
}
