#ifndef INPUT_STATE_ANSWER_DECODER_H
#define INPUT_STATE_ANSWER_DECODER_H

#include "./InputsStateAnswer.h"

// TODO
class InputsStateAnswerEncoder : public ByteStepEncoder<InputsStateAnswer> {
  public:
    InputsStateAnswerEncoder(InputsStateAnswer * input): ByteStepEncoder<InputsStateAnswer>(input) {
    }

  protected:
    void * _encoder; // ByteStepEncoder<T>

    uint8_t _next() {
//     std::cout << "InputsStateAnswerEncoder - step: " << this->_step << '\n';

      switch(this->_step) {
        case 0: // id low
          this->_step = 1;
          return this->_input->id & 0xff;

        case 1: // id high
          this->_step = 2;
          return (this->_input->id >> 8) & 0xff;

        case 2: // code
          this->_step = 3;
          return this->_input->code;

        case 3: // state

          switch (this->_input->code) {
            case CMD_READ_INPUTS:
            //            this->_encoder = new InputsStateAnswerEncoder(this->_input.answer as InputsStateAnswer);
              break;
            case CMD_PWM:
              this->_encoder = nullptr;
              break;
            case CMD_MOVE:
              this->_encoder = nullptr;
              break;
            default:
              THROW_ERROR("AnswerEncoder - Unexpected command code : " + std::to_string(this->_input->code));
              return 0;
          }

          this->_step = 4;
          return this->_input->state;

        case 4: // answer
          if((this->_encoder == nullptr) || (BYTE_STEP_ENCODER_TYPE(this->_encoder))->done()) {
            this->_done = true;
            return 0;
          } else {
            return (BYTE_STEP_ENCODER_TYPE(this->_encoder))->next();
          }

        default:
          THROW_ERROR("AnswerEncoder - Unexpected step : " + std::to_string(this->_step));
          return 0;
      }
    }
};


#endif