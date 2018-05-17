
export class InputsStateAnswer {
  public pinsState: number;
  public adcValues: number[];

  constructor(pinsState: number = 0, adcValues: number[]= new Array<number>(8).fill(0)) {
    this.pinsState = pinsState;
    this.adcValues = adcValues;
  }
}
