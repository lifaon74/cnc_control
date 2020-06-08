
export function NormalizeCyclicIndex(
  index: number,
  limit: number,
): number {
  index = index % limit;
  return (index < 0)
    ? (index + limit)
    : index;
}


// export function ShiftCyclicIndex(
//   index: number,
//   offset: number,
//   limit: number,
// ): number {
//   return (index + (offset % limit)) % limit;
//   // const _index: number = (index + offset) % limit;
//   // return (_index < 0)
//   //   ? (_index + limit)
//   //   : _index;
// }

// if start === end:
// innerSize() => 0
// outerSize() => size

/**
 * [start, end[
 */
export class CyclicRange {
  public readonly size: number;
  public readonly start: number;
  public readonly end: number;
  public readonly startBeforeEnd: boolean;

  protected readonly sizePlusOne: number;

  constructor(size: number) {
    if (size < 1) {
      throw new RangeError(`Expected size greater than 1`);
    }
    this.size = size;
    this.start = 0; // [0, this.size]
    this.end = 0; // [0, this.size]
    this.startBeforeEnd = true;
    this.sizePlusOne = this.size + 1;
  }

  startToEnd(): number {
    return this.startBeforeEnd
      ? (this.end - this.start)
      : (this.end - this.start + this.size);
  }

  endToStart(): number {
    return this.size - this.startToEnd();
  }


  shiftStart(offset: number): void {
    if (offset < 0) {
      if (offset >= -this.endToStart()) {
        (this.start as number) = (this.start + offset + this.size) % this.size;
        (this.startBeforeEnd as boolean) = (this.start < this.end);
      } else {
        throw new Error(`Cannot shift start less than ${ -this.endToStart() }`);
      }
    } else if (offset > 0) {
      if (offset <= this.startToEnd()) {
        (this.start as number) = (this.start + offset) % this.size;
        (this.startBeforeEnd as boolean) = (this.start <= this.end);
      } else {
        throw new Error(`Cannot shift start more than ${ this.startToEnd() }`);
      }
    }
  }

  shiftEnd(offset: number): void {
    if (offset < 0) {
      if (offset >= -this.startToEnd()) {
        (this.end as number) = (this.end + offset + this.size) % this.size;
        (this.startBeforeEnd as boolean) = (this.start <= this.end);
      } else {
        throw new Error(`Cannot shift end less than ${ -this.startToEnd() }`);
      }
    } else if (offset > 0) {
      if (offset <= this.endToStart()) {
        (this.end as number) = (this.end + offset) % this.size;
        (this.startBeforeEnd as boolean) = (this.start < this.end);
      } else {
        throw new Error(`Cannot shift end more than ${ this.endToStart() }`);
      }
    }
  }

  /**
   * Resets the read and write indexes
   */
  reset(): void {
    (this.start as number) = 0;
    (this.end as number) = 0;
  }
}


export function debugCyclicRange(): void {
  const range = new CyclicRange(10);
  console.log(range.startToEnd(), range.endToStart());
  // range.shiftStart(2);
  // range.shiftStart(-2);
  range.shiftEnd(10);
  console.log(range.startToEnd(), range.endToStart());
  // range.shiftStart(2);
  // range.shiftStart(-2);
  range.shiftEnd(-1);
  console.log(range.startToEnd(), range.endToStart());

  // for (let i = 0; i < 7; i++) {
  //   range.shiftEnd(2);
  //   range.shiftStart(2);
  //   console.log('start', range.start, 'end', range.end, 'startToEnd', range.startToEnd(), 'endToStart', range.endToStart());
  // }
}
