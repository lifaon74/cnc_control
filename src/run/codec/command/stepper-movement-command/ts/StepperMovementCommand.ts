
export class StepperMove {
  public pin: number;
  public target: number;

  constructor(pin: number,
              target: number) {
    this.pin = pin;
    this.target = target;
  }

  get pinMask(): number {
    return 1 << this.pin;
  }
}

export class StepperMovementCommand {

  public moves: StepperMove[];
  public duration: number;
  public initialSpeed: number;
  public acceleration: number;

  constructor() {
    this.moves = [];
    this.duration = 0;
    this.initialSpeed = 0;
    this.acceleration = 0;
  }

  get pinMask(): number {
    let pinMask: number = 0;
    for(let i = 0; i < this.moves.length; i++) {
      pinMask |= this.moves[i].pinMask;
    }
    return pinMask;
  }
}


