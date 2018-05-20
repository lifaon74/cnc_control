
export class InputsStateAnswer {
  public pinsState: number;
  public adcValues: Uint16Array;

  constructor(pinsState: number = 0, adcValues: Uint16Array = new Uint16Array(8)) {
    this.pinsState = pinsState;
    this.adcValues = adcValues;
  }
}
