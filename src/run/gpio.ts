import * as rpio from 'rpio';
import { $delay } from '../classes/misc';

export class SPIController {

  static maxClockFrequency: number = 2e6; // 2Mhz
  static getMaxSPIClockDivider(): number {
    // return Math.pow(2, Math.ceil(Math.log(400e6 / SPIController.maxClockFrequency) / Math.log(2)));
    return 128; // 16
  }


  static initRPIO(): void {
    rpio.init({
      gpiomem: false,
      mapping: 'physical'
    });
  }

  static initSPI(): void {
    rpio.spiBegin();
    rpio.spiSetClockDivider(SPIController.getMaxSPIClockDivider());
  }

  public outBuffer: Buffer;
  public inBuffer: Buffer;

  constructor(public csPin: number) {
    this.initCSPin();
  }

  initCSPin(): void {
    rpio.open(this.csPin, rpio.OUTPUT, rpio.HIGH);
  }

  initBuffers(size: number): void {
    this.outBuffer = new Buffer(size);
    this.inBuffer = new Buffer(size);
  }

  flush(): void {
    rpio.write(this.csPin, rpio.LOW);
    rpio.spiTransfer(this.outBuffer, this.inBuffer, this.outBuffer.length);
    rpio.write(this.csPin, rpio.HIGH);
  }
}


export class GPIOController {
  static init(): void {
    rpio.init({
      gpiomem: false,
      mapping: 'physical'
    });

    rpio.spiBegin();
    rpio.spiSetClockDivider(16);
  }

  public csPin: number;
  public plPin: number;

  public outBuffer: Buffer;
  public inBuffer: Buffer;

  constructor(csPin: number, plPin: number, groups: number) {
    this.csPin      = csPin;
    this.plPin      = plPin;
    this.outBuffer  = Buffer.alloc(groups);
    this.inBuffer   = Buffer.alloc(groups);

    rpio.open(this.csPin, rpio.OUTPUT, rpio.HIGH);
    rpio.open(this.plPin, rpio.OUTPUT, rpio.HIGH);
  }

  get length(): number {
    return this.outBuffer.length * 8;
  }

  public read(pin: number): boolean {
    return (this.inBuffer[Math.floor(pin / 8)] & (1 << (pin % 8))) !== 0;
  }

  public write(pin: number, state: boolean) {
    // console.log(Math.floor(pin / this.length), (pin % 8));
    if(state) {
      this.outBuffer[Math.floor(pin / 8)] |= (1 << (pin % 8));
    } else {
      this.outBuffer[Math.floor(pin / 8)] &= ~(1 << (pin % 8));
    }
  }

  public update() {
    // console.log('update', Array.from(this.outBuffer).map(_ => _.toString(2)).join(', '));
    // console.log('update', Array.from(this.inBuffer).map(_ => _.toString(2)).join(', '));
    rpio.write(this.plPin, rpio.LOW);
    rpio.write(this.plPin, rpio.HIGH);
    rpio.write(this.csPin, rpio.LOW);
    rpio.spiTransfer(this.outBuffer, this.inBuffer, this.outBuffer.length);
    rpio.write(this.csPin, rpio.HIGH);
  }
}

// function SPISpeedTest() {
//
//   SPIController.init();
//   let spi = new SPIController(7);
//   spi.initBuffers(3);
//
//   let t1 = process.hrtime();
//   for(let i = 0; i < 1000000; i++) { // 11.47 => 2Mhz, 7 => 10Mhz, 5 => 20Mhz, 3.47 => 200Mhz
//     // div64 => 7209 vs 5234
//     // div32 => 5145 vs 3060
//     // div16 => 4032 vs 2139
//     // variable clock divider 16~256 => 4918
//     rpio.spiSetClockDivider(16);
//     spi.flush();
//     rpio.spiSetClockDivider(256);
//   }
//   let t2 = process.hrtime(t1);
//   let nano = t2[0] * 1e9 + t2[1];
//   console.log(nano / 1e6);
// }


/**
 * Blink a LED on pin 7
 * @returns {Promise<void>}
 * @constructor
 */
async function BlinkTest() {
  rpio.init({
    gpiomem: false,
    mapping: 'physical'
  });
  rpio.open(7, rpio.OUTPUT, rpio.LOW);
  let state: boolean = true;
  while(true) {
    state = !state;
    rpio.write(7, state ? rpio.HIGH : rpio.LOW);
    await $delay(1000);
  }
}


async function GPIOTest() {
  GPIOController.init();
  const gpio = new GPIOController(7, 11,2);

  let state: boolean = true;
  while(true) {
    state = !state;
    gpio.write(0, state);
    // console.log(gpio.read(8));
    gpio.update();

    await $delay(100);
  }

}

// GPIOTest();

// BlinkTest();