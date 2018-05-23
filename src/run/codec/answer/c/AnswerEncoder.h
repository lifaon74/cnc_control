#ifndef ANSWER_DECODER_H
#define ANSWER_DECODER_H

#include "./Answer.h"
//#include "../pwm-command/c/PWMCommandDecoder.h"
//#include "../stepper-movement-command/c/StepperMovementCommandDecoder.h"

#define BYTE_STEP_ENCODER_TYPE (ByteStepEncoder<void>*)


class AnswerEncoder : public ByteStepEncoder<Answer> {
  public:
    AnswerEncoder(Answer * input): ByteStepEncoder<Answer>(input) {
      this->_input->print();
    }

  protected:
    void * _encoder; // ByteStepEncoder<T>

    uint8_t _next() {
//     std::cout << "AnswerEncoder - step: " << this->_step << '\n';

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