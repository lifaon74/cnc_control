#ifndef GPIO_CONTROLLER_H
#define GPIO_CONTROLLER_H

class GPIOController {
  public:
//  static init(): void {
//    rpio.init({
//      gpiomem: false,
//      mapping: 'physical'
//    });
//
//    rpio.spiBegin();
//    rpio.spiSetClockDivider(16);
//  }

  uint8_t csPin;
  uint8_t plPin;
  uint8_t length;

  uint8_t * outBuffer;
  uint8_t * inBuffer;

  GPIOController(uint8_t csPin, uint8_t plPin, uint8_t length) {
    this->csPin      = csPin;
    this->plPin      = plPin;
    this->length     = length;
    this->outBuffer  = new uint8_t[length];
    this->inBuffer   = new uint8_t[length];

//    rpio.open(this->csPin, rpio.OUTPUT, rpio.HIGH);
//    rpio.open(this->plPin, rpio.OUTPUT, rpio.HIGH);
  }

  ~GPIOController() {
    delete [] this->outBuffer;
    delete [] this->inBuffer;
  }

  uint8_t pinCount() {
    return this->length * 8;
  }

  bool read(uint8_t pin) {
    return (this->inBuffer[pin / 8] & (1 << (pin % 8))) != 0;
  }

  void write(uint8_t pin, bool state) {
    if(state) {
      this->outBuffer[pin / 8] |= (1 << (pin % 8));
    } else {
      this->outBuffer[pin / 8] &= ~(1 << (pin % 8));
    }
  }

  void update() {
    // console.log('update', Array.from(this->outBuffer).map(_ => _.toString(2)).join(', '));
    // console.log('update', Array.from(this->inBuffer).map(_ => _.toString(2)).join(', '));
//    rpio.write(this->plPin, rpio.LOW);
//    rpio.write(this->plPin, rpio.HIGH);
//    rpio.write(this->csPin, rpio.LOW);
//    rpio.spiTransfer(this->outBuffer, this->inBuffer, this->outBuffer.length);
//    rpio.write(this->csPin, rpio.HIGH);
  }
};


#endif