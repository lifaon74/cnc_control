#ifndef CODEC_H
#define CODEC_H

class Iterator {
  public:
    Iterator() {
      this->_done = false;
    }

    bool done() {
      return this->_done;
    }

  protected:
    bool _done;

    void throwIfDone() {
//      if(this->done()) nullptr; // TODO throw
    }
};


template<typename T>
class ByteDecoder: public Iterator {
  public:
    ByteDecoder() {
      this->_output = nullptr;
    }

    T * output() {
      return this->_output;
    }

    virtual void next(uint8_t value) = 0;

  protected:
    T * _output;
};

template<typename T>
class ByteStepDecoder: public ByteDecoder<T> {
  public:

    ByteStepDecoder() {
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
      this->_step = 0;
      this->_next(0);
    }

    virtual void _next(uint8_t value) = 0;
};


#endif