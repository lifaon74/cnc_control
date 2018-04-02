export abstract class Iterator {
  protected _done: boolean;

  constructor() {
    this._done = false;
  }

  get done(): boolean {
    return this._done;
  }

  protected throwIfDone(): void {
    if (this.done) {
      throw new Error(`${this.constructor.name} is done`);
    }
  }
}
