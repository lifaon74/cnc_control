#ifndef COMMAND_DECODER_H
#define COMMAND_DECODER_H

#include "./Command.h"
#include "../../pwm/c/PWMDecoder.h"
#include "../../stepper-movement/c/StepperMovementDecoder.h"

#define BYTE_STEP_DECODER_TYPE (ByteStepDecoder<void>*)


class CommandDecoder : public ByteStepDecoder<Command> {
  public:
    CommandDecoder() {
    }

  protected:
    void * _decoder; // ByteStepDecoder<T>

    void _next(uint8_t value) {
      while(true) {
//       std::cout << "Command - step: " << this->_step << '\n';

        switch(this->_step) {
          case 0: // init
            this->_output = new Command();
            this->_step = 1;
            return;

          case 1: // id low
            this->_output->id = value;
            this->_step = 2;
            return;

          case 2: // id high
            this->_output->id |= ((uint16_t) value) << 8;
            this->_step = 3;
            return;

          case 3: // code
            this->_output->code = value;
            switch (value) {
              case CMD_PWM:
                this->_decoder = new PWMDecoder();
                break;
              case CMD_MOVE:
                this->_decoder = new StepperMovementDecoder();
                break;
              default:
                THROW_ERROR("CommandDecoder - Unexpected command code : " + std::to_string(value));
                return;
            }
            this->_step = 4;

          case 4: // decode command
            if((BYTE_STEP_DECODER_TYPE(this->_decoder))->done()) {
              this->_output->command = (BYTE_STEP_DECODER_TYPE(this->_decoder))->output();
              this->_done = true;
              delete (BYTE_STEP_DECODER_TYPE(this->_decoder));
            } else {
              this->_step = 5;
            }
            return;

          case 5:
            (BYTE_STEP_DECODER_TYPE(this->_decoder))->next(value);
            this->_step = 4;
            break;

          default:
            THROW_ERROR("CommandDecoder - Unexpected step : " + std::to_string(this->_step));
            return;
        }
      }
    }
};


#endif