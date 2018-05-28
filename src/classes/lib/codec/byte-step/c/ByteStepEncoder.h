#ifndef BYTE_STEP_ENCODER_H
#define BYTE_STEP_ENCODER_H

template<typename T>
class ByteStepEncoder: public ByteEncoder<T> {
  public:

    ByteStepEncoder() {
      this->_step = 0;
      this->_done = true;
    }

    virtual ~ByteStepEncoder() {}

    uint8_t next() override {
      this->throwIfDone();
      uint8_t value = this->_yieldValue;
      this->_yieldValue = this->_next();
      return value;
    }

    ByteStepEncoder * init(T * input) {
      this->_input = input;
      this->_step = 0;
      this->_done = (this->_input == nullptr);
      if (!this->_done) {
        this->_yieldValue = this->_next();
      }
      return this;
    }

  protected:
    uint32_t _step;
    uint8_t _yieldValue;

    virtual uint8_t _next() = 0;
};

#endif