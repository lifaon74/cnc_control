#ifndef BYTE_ENCODER_H
#define BYTE_ENCODER_H

template<typename T>
class ByteEncoder: public Iterator {
  public:
    ByteEncoder(T * input): Iterator() {
      this->_input = input;
    }

    T * input() {
      return this->_input;
    }

    virtual uint8_t next() = 0;

  protected:
    T * _input;
};

#endif