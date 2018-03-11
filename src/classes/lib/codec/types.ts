export type Pointer = number;
export type GetPointerFunction = () => Pointer;

export class DataCloneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
