#ifndef BYTE_STEP_ENCODER_H
#define BYTE_STEP_ENCODER_H

template<typename T>
class ByteStepEncoder: public ByteEncoder<T> {
  public:

    ByteStepEncoder(T * input, bool initCall = true)
    : ByteEncoder<T>(input) {
      this->_step = 0;
      if (initCall) {
        this->_init();
      }
    }

    virtual ~ByteStepEncoder() {}

    uint8_t next() override {
      this->throwIfDone();
      uint8_t value = this->_yieldValue;
      this->_yieldValue = this->_next();
      return value;
    }

    void reset() {
      this->_step = 0;
      this->_done = false;
      this->_init();
    }

  protected:
    uint32_t _step;
    uint8_t _yieldValue;

    void _init() {
      this->_yieldValue = this->_next();
    }

    virtual uint8_t _next() = 0;
};

#endif