#ifndef PWM_COMMAND_DECODER_H
#define PWM_COMMAND_DECODER_H

#include "./PWMCommand.h"

class PWMCommandDecoder: public ByteStepDecoder<PWMCommand> {
   public:
      PWMCommandDecoder() {
      }
  
      ~PWMCommandDecoder() {
        std::cout << RED_TERMINAL("delete PWMCommandDecoder\n");
      }
  
  protected:
    Uint8Array * _bytes;
    uint32_t _index;


  void _next(uint8_t value) {
    while (true) {
      switch (this->_step) {
        case 0: // init
          this->_output = new PWMCommand();
          this->_step = 1;
          return;

        case 1: // pin
          this->_output->pin = value;
          this->_bytes = new Uint8Array(8);

          this->_index = 0;
          this->_step = 2;

        case 2: // value
          if (this->_index >= this->_bytes->length) {
            this->_output->value = ((double *) (this->_bytes->buffer))[0];
            this->_index = 0;
            this->_step = 4;
            break;
          } else {
            this->_step = 3;
            return;
          }
        case 3:
          this->_bytes->buffer[this->_index++] = value;
          this->_step = 2;
          break;

        case 4: // period
          if (this->_index >= this->_bytes->length) {
            this->_output->period = ((double *) (this->_bytes->buffer))[0];
            delete (this->_bytes);
            this->_done = true;
            return;
          } else {
            this->_step = 5;
            return;
          }
        case 5:
//          (*(this->_bytes))
          this->_bytes->buffer[this->_index++] = value;
          this->_step = 4;
          break;


        default:
          THROW_ERROR("PWMCommandDecoder - Unexpected step : " + std::to_string(this->_step));
          return;
      }
    }
  }
};

#endif

