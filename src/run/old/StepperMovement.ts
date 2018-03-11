import { GetTime } from '../../../classes/misc';

export class StepperMove {
  public pin: number;
  public target: number;
  public current: number;

  constructor(pin: number,
              target: number,
              current: number = 0) {
    this.pin = pin;
    this.target = target;
    this.current = current;
  }

  get sign(): number {
    return Math.sign(this.target);
  }

  get distance(): number {
    return Math.abs(this.target);
  }

  get finished(): boolean {
    return Math.abs(this.current) >= Math.abs(this.target);
  }

  get pinMask(): number {
    return 1 << this.pin;
  }
}

export class StepperMovement {

  public moves: StepperMove[];
  public duration: number;
  public initialSpeed: number;
  public acceleration: number;
  public initialTime: number;

  constructor() {
    this.moves = [];
    this.duration = 0;
    this.initialSpeed = 0;
    this.acceleration = 0;

    this.initialTime = 0;
  }

  get pinMask(): number {
    let pinMask: number = 0;
    for(let i = 0; i < this.moves.length; i++) {
      pinMask |= this.moves[i].pinMask;
    }
    return pinMask;
  }

  start(): this {
    this.initialTime = GetTime();
    return this;
  }
}


// [ MOVE, StepperUsed, Duration (f64), InitialSpeed (f64), Acceleration(f64), values...(int32[])]
// [ COMMANDS.MOVE, 0b00000111, 1e-3, 4, 5, 1234, 5678, 9101]

export class StepperMovementEncoder extends ByteStepEncoder<StepperMovement> {
  protected _bytes: Uint8Array;
  protected _index: number;
  protected _moveIndex: number;

  constructor(input: StepperMovement) {
    super(input);
  }

  protected _next(): number {
    while(true) {
      switch(this._step) {
        case 0: // pinMask
          this._bytes = new Uint8Array(new Float64Array([this._input.duration]).buffer);
          this._index = 0;
          this._step = 1;
          return this._input.pinMask;
        case 1: // duration
          if(this._index >= this._bytes.length) {
            this._bytes = new Uint8Array(new Float64Array([this._input.initialSpeed]).buffer);
            this._index = 0;
            this._step = 2;
          } else {
            return this._bytes[this._index++];
          }
        case 2: // initialSpeed
          if(this._index >= this._bytes.length) {
            this._bytes = new Uint8Array(new Float64Array([this._input.acceleration]).buffer);
            this._index = 0;
            this._step = 3;
          } else {
            return this._bytes[this._index++];
          }
        case 3: // acceleration
          if(this._index >= this._bytes.length) {
            this._moveIndex = 0;
            this._step = 4;
          } else {
            return this._bytes[this._index++];
          }

        case 4: // movements
          if(this._moveIndex >= this._input.moves.length) {
            this._done = true;
            return 0;
          } else {
            this._bytes = new Uint8Array(new Int32Array([this._input.moves[this._moveIndex].target]).buffer);
            this._index = 0;
            this._step = 5;
          }
        case 5: // movement distance
          if(this._index >= this._bytes.length) {
            this._moveIndex++;
            this._step = 4;
            break;
          } else {
            return this._bytes[this._index++];
          }
        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}

export class StepperMovementDecoder extends ByteStepDecoder<StepperMovement> {
  protected _bytes: Uint8Array;
  protected _index: number;
  protected _moveIndex: number;

  constructor() {
    super();
    this._output = new StepperMovement();
  }

  protected _next(value: number): void {
    while(true) {
      switch(this._step) {
        case 0: // init
          this._step = 1;
          return;

        case 1: // pinMask
          for(let i = 0; i < 8; i++) {
            if(value & (1 << i)) {
              this._output.moves.push(new StepperMove(i, 0));
            }
          }
          this._bytes = new Uint8Array(Float64Array.BYTES_PER_ELEMENT);
          this._index = 0;
          this._step = 2;

        case 2: // duration
          if(this._index >= this._bytes.length) {
            this._output.duration = new Float64Array(this._bytes.buffer)[0];
            this._index = 0;
            this._step = 4;
            break;
          } else {
            this._step = 3;
            return;
          }
        case 3:
          this._bytes[this._index++] = value;
          this._step = 2;
          break;

        case 4: // initialSpeed
          if(this._index >= this._bytes.length) {
            this._output.initialSpeed = new Float64Array(this._bytes.buffer)[0];
            this._index = 0;
            this._step = 6;
            break;
          } else {
            this._step = 5;
            return;
          }
        case 5:
          this._bytes[this._index++] = value;
          this._step = 4;
          break;

        case 6: // acceleration
          if(this._index >= this._bytes.length) {
            this._output.acceleration = new Float64Array(this._bytes.buffer)[0];
            this._moveIndex = 0;
            this._step = 8;
            break;
          } else {
            this._step = 7;
            return;
          }
        case 7:
          this._bytes[this._index++] = value;
          this._step = 6;
          break;

        case 8: // movements
          if(this._moveIndex >= this._output.moves.length) {
            this._done = true;
            return;
          } else {
            this._bytes = new Uint8Array(Int32Array.BYTES_PER_ELEMENT);
            this._index = 0;
            this._step = 9;
          }

        case 9: // movement distance
          if(this._index >= this._bytes.length) {
            this._output.moves[this._moveIndex].target = new Int32Array(this._bytes.buffer)[0];
            this._moveIndex++;
            this._step = 8;
            break;
          } else {
            this._step = 10;
            return;
          }
        case 10:
          this._bytes[this._index++] = value;
          this._step = 9;
          break;

        default:
          throw new Error('Unexpected step : ' + this._step);
      }
    }
  }
}


function test() {
  const stepperMovement: StepperMovement = new StepperMovement();
  stepperMovement.duration = 10;
  stepperMovement.initialSpeed = 0.5;
  stepperMovement.acceleration = 0.1;
  stepperMovement.moves.push(new StepperMove(2, 17));
  stepperMovement.moves.push(new StepperMove(3, -28));
  codec(new StepperMovementEncoder(stepperMovement), new StepperMovementDecoder());

  let a: number = 0;
  // console.time('StepperMovementEncoder');
  // for(let i = 0; i < 1e5; i++) {
  //   a += encode(new StepperMovementEncoder(stepperMovement)).length;
  // }
  // console.timeEnd('StepperMovementEncoder');
  // console.log('a', a);

  console.time('StepperMovementDecoder');
  for(let i = 0; i < 1e5; i++) {
    const encoder = new StepperMovementEncoder(stepperMovement);
    const decoder = new StepperMovementDecoder();
    while(!encoder.done) {
      decoder.next(encoder.next());
    }
    a += decoder.output.duration;
    // a += decode(new StepperMovementDecoder(), encode(new StepperMovementEncoder(stepperMovement))).duration;
  }
  console.timeEnd('StepperMovementDecoder');
  console.log('a', a);
}

// test();