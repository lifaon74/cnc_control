import { GetTime } from '../../../../classes/misc';

export class PWM {
  public value: number;
  public pin: number;
  public period: number;

  constructor(pin: number = 0, value: number = 0, period: number = 1) {
    this.pin = pin;
    this.value = value;
    this.period = period;
  }

  isActive(time: number = GetTime()) {
    return ((time % this.period) < (this.value * this.period));
  }

  getState(time?: number): number {
    return this.isActive(time) ? 1 : 0;
  }
}
