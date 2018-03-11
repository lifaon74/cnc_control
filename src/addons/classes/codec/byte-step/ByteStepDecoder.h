#ifndef BYTE_STEP_DECODER_H
#define BYTE_STEP_DECODER_H

template<typename T>
class ByteStepDecoder: public ByteDecoder<T> {
  public:

    ByteStepDecoder() {
      this->_step = 0;
      this->_init();
    }

    virtual ~ByteStepDecoder() {}

    void next(uint8_t value) override {
      this->throwIfDone();
      this->_next(value);
    }

  protected:
    uint32_t _step;

    void _init() {
      this->_next(0);
    }

    virtual void _next(uint8_t value) = 0;
};

#endif