#ifndef BYTE_DECODER_H
#define BYTE_DECODER_H

template<typename T>
class ByteDecoder: public Iterator {
  public:
    ByteDecoder(): Iterator() {
      this->_output = nullptr;
    }

    T * output() {
      return this->_output;
    }

    virtual void next(uint8_t value) = 0;

  protected:
    T * _output;
};

#endif