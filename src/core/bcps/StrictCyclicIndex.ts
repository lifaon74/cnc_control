
export class StrictCyclicIndex {
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
    const readable: number = (this.writeIndex - this.readIndex);
    return (readable < 0)
      ? (readable + this.length)
      : readable;
  }

  /**
   * Returns the number of writable slots
   */
  writable(): number {
    return (this.readIndex - this.writeIndex + this.length - 1) % this.length;
  }

  /**
   * <Increment> the read index by "length", meaning that less slots are readable and more are writable
   */
  read(length: number = 1): void {
    if (length < 1) {
      throw new RangeError(`Expected length greater than 1.`);
    } else if (this.readable() >= length) {
      (this.readIndex as number) = (this.readIndex + length) % this.length;
    } else {
      throw new Error(`Not readable`);
    }
  }

  /**
   * <Increment> the write index by "length", meaning that more slots are readable and less are writable
   */
  write(length: number = 1, force: number = 0): void {
    if (length < 1) {
      throw new RangeError(`Expected length greater than 1.`);
    } else if (this.writable() >= length) {
      (this.writeIndex as number) = (this.writeIndex + length) % this.length;
    } else if (force > 0) {
      (this.writeIndex as number) = (this.writeIndex + length) % this.length;
      (this.readIndex as number) = (this.writeIndex + force) % this.length;
    } else {
      throw new Error(`Not writable`);
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
