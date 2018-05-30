#ifndef INPUT_STATE_ANSWER_DECODER_H
#define INPUT_STATE_ANSWER_DECODER_H

#include "./InputsStateAnswer.h"

class InputsStateAnswerEncoder : public ByteStepEncoder<InputsStateAnswer> {
  public:
    InputsStateAnswerEncoder() {
    }

    InputsStateAnswerEncoder * init(InputsStateAnswer * input) {
      return (InputsStateAnswerEncoder *) ByteStepEncoder<InputsStateAnswer>::init(input);
    }

    ~InputsStateAnswerEncoder() {
//      std::cout << RED_TERMINAL("delete InputsStateAnswerEncoder\n");
    }

  protected:
    Uint8Array * _bytes;
    uint32_t _index;

    uint8_t _next() {
//     std::cout << "InputsStateAnswerEncoder - step: " << this->_step << '\n';

      switch(this->_step) {
        case 0: // pins state low
          this->_step = 1;
          return this->_input->pinsState & 0xff;

        case 1: // pins state high
          this->_bytes = new Uint8Array((uint8_t *) (this->_input->adcValues->buffer), this->_input->adcValues->length * this->_input->adcValues->BYTES_PER_ELEMENT());
          this->_index = 0;
          this->_step = 2;
          return (this->_input->pinsState >> 8) & 0xff;

        case 2: // adc values
          if (this->_index >= this->_bytes->length) {
            delete this->_bytes;
            this->_done = true;
            return 0;
          } else {
            return this->_bytes->buffer[this->_index++];
          }

        default:
          THROW_ERROR("InputsStateAnswerEncoder - Unexpected step : " + std::to_string(this->_step));
          return 0;
      }
    }
};


#endif