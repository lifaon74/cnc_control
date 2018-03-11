#ifndef GPIO_CONTROLLER_H
#define GPIO_CONTROLLER_H

#ifdef RASPBERRY
  #include "../libs/bcm2835/bcm2835.h"
#endif

#define GPIO_INPUT 0x0
#define GPIO_OUTPUT 0x1

#define GPIO_LOW 0x0
#define GPIO_HIGH 0x1

int8_t PINMAP_40[] = {
  -1, -1, /*  P1  P2 */
  2, -1, /*  P3  P4 */
  3, -1, /*  P5  P6 */
  4, 14, /*  P7  P8 */
  -1, 15, /*  P9  P10 */
  17, 18, /* P11  P12 */
  27, -1, /* P13  P14 */
  22, 23, /* P15  P16 */
  -1, 24, /* P17  P18 */
  10, -1, /* P19  P20 */
  9, 25, /* P21  P22 */
  11, 8, /* P23  P24 */
  -1, 7, /* P25  P26 */
  0, 1, /* P27  P28 */
  5, -1, /* P29  P30 */
  6, 12, /* P31  P32 */
  13, -1, /* P33  P34 */
  19, 16, /* P35  P36 */
  26, 20, /* P37  P38 */
  -1, 21    /* P39  P40 */
};


void pinMode(uint8_t pin, uint8_t mode) {
  #ifdef RASPBERRY
    bcm2835_gpio_fsel(pin, mode);
  #endif
}

void digitalWrite(uint8_t pin, uint8_t state) {
  #ifdef RASPBERRY
    bcm2835_gpio_write(pin, state);
  #endif
}




class GPIOController {
  public:
  static void init() {
    #ifdef RASPBERRY
      bcm2835_init(false);
      bcm2835_spi_begin();
      bcm2835_spi_setClockDivider(16);
    #endif
  }

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

    pinMode(this->csPin, GPIO_OUTPUT);
    pinMode(this->plPin, GPIO_OUTPUT);
    digitalWrite(this->csPin, GPIO_HIGH);
    digitalWrite(this->plPin, GPIO_HIGH);
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
    digitalWrite(this->plPin, GPIO_LOW);
    digitalWrite(this->plPin, GPIO_HIGH);

    digitalWrite(this->csPin, GPIO_LOW);
    #ifdef RASPBERRY
      bcm2835_spi_transfernb((char *) this->outBuffer, (char *) this->inBuffer, this->length);
    #endif
    digitalWrite(this->csPin, GPIO_HIGH);
  }
};


#endif