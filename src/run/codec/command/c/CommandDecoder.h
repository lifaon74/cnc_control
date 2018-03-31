#ifndef COMMAND_DECODER_H
#define COMMAND_DECODER_H

#include "./Command.h"

#define BYTE_STEP_DECODER_TYPE (ByteStepDecoder<void *>*)


class CommandDecoder : public ByteStepDecoder<Command> {
  public:
    CommandDecoder() {
      this->_output = new Command();
      this->_init();
    }

    uint16_t id() {
      return this->_id;
    }

  protected:
    uint16_t _id;
    uint8_t _code;
    void * _decoder; // ByteStepDecoder<T>

    void _next(uint8_t value) {
      while(true) {
//      std::cout << "step: " << this->_step << "\n";

        switch(this->_step) {
          case 0: // init
            this->_step = 1;
            return;

          case 1: // id low
            this->_id = value;
            this->_step = 2;
            return;

          case 2: // id high
            this->_id |= value << 8;
            this->_step = 3;
            return;

          case 3: // code
            this->_code = value;
            switch (this->_code) {
              case CMD_MOVE:
                this->_decoder = new StepperMovementDecoder();
                break;
              default:
                Nan::ThrowError("Unexpected command : " + this->_code);
                return;
            }
            this->_step = 4;

          case 4: // decode command
            if((BYTE_STEP_DECODER_TYPE(this->_decoder))->done()) {
              this->_output = new Command(this->_code, (BYTE_STEP_DECODER_TYPE(this->_decoder))->output());
              this->_done = true;
              delete (BYTE_STEP_DECODER_TYPE(this->_decoder));
              return;
            } else {
              this->_step = 5;
              return;
            }
          case 5:
            (BYTE_STEP_DECODER_TYPE(this->_decoder))->next(value);
            this->_step = 4;
            break;

          default:
//            throw std::logic_error("Unexpected step : " + this->_step);
            Nan::ThrowError("Unexpected step : " + this->_step);
            return;
        }
      }
    }
};


#endif