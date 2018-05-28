#ifndef BYTE_STEP_DECODER_H
#define BYTE_STEP_DECODER_H

template<typename T>
class ByteStepDecoder: public ByteDecoder<T> {
  public:

    ByteStepDecoder() {
      this->_step = 0;
      this->_done = true;
    }

    virtual ~ByteStepDecoder() {}

    void next(uint8_t value) override {
      this->throwIfDone();
      this->_next(value);
    }

    ByteStepDecoder * init() {
      this->_output = nullptr;
      this->_step = 0;
      this->_done = false;
      this->_next(0);
      return this;
    }

  protected:
    uint32_t _step;

    virtual void _next(uint8_t value) = 0;
};

#endif