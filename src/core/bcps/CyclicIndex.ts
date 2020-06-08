// if readIndex === writeIndex:
// readable() => 0
// writable() => this.length - 1
// INFO cant read  write more than (this.length - 1)

export class CyclicIndex {
  public readonly length: number;
  public readonly readIndex: number;
  public readonly writeIndex: number;

  constructor(length: number) {
    if (length < 1) {
      throw new RangeError(`Expected length greater than 1.`);
    }
    this.length = length;
    this.readIndex = 0;
    this.writeIndex = 0;
  }


  /**
   * Returns the number of readable slots
   */
  readable(): number {
    return (this.writeIndex - this.readIndex + this.length) % this.length;
  }

  /**
   * Returns the number of writable slots
   */
  writable(): number {
    return (this.readIndex - this.writeIndex + this.length - 1) % this.length;
  }

  /**
   * <Increments> the read index by "length", meaning that less slots are readable and more are writable
   */
  read(length: number = 1): void {
    if (length < 1) {
      throw new RangeError(`Expected length greater than 1`);
    } else if (this.readable() >= length) {
      (this.readIndex as number) = (this.readIndex + length) % this.length;
    } else {
      throw new Error(`Cannot read more`);
    }
  }

  /**
   * <Increments> the write index by "length", meaning that more slots are readable and less are writable
   */
  write(length: number = 1, force: boolean = false): void {
    if (length < 1) {
      throw new RangeError(`Expected length greater than 1`);
    } else if (this.writable() >= length) {
      (this.writeIndex as number) = (this.writeIndex + length) % this.length;
    } else if (force) {
      (this.writeIndex as number) = (this.writeIndex + length) % this.length;
      (this.readIndex as number) = this.writeIndex;
    } else {
      throw new Error(`Cannot write more`);
    }
  }

  /**
   * <Decrements> the write index by "length", meaning that less slots are readable and more are writable
   */
  unwrite(length: number = 1): void {
    if (this.readable() >= length) {
      const writeIndex: number = (this.writeIndex - length) % this.length;
      (this.writeIndex as number) = (writeIndex < 0)
        ? (writeIndex + this.length)
        : writeIndex;
    } else {
      throw new Error(`Cannot undo write`);
    }
  }

  /**
   * Returns a read index shifted by "offset"
   */
  relativeReadIndex(offset: number): number {
    const readable: number = this.readable();
    const readIndex: number = (this.readIndex + offset) % readable;
    return (readIndex < 0)
      ? (readIndex + readable)
      : readIndex;
  }

  /**
   * Resets the read and write indexes
   */
  reset(): void {
    (this.readIndex as number) = 0;
    (this.writeIndex as number) = 0;
  }
}


export function debugCyclicIndex(): void {
  const index = new CyclicIndex(10);
  console.log(index.readable(), index.writable());
  index.write(2);
  console.log(index.readable(), index.writable());
  index.unwrite(2);
  console.log(index.readable(), index.writable());
}
