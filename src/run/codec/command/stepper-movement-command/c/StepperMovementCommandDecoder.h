#ifndef STEPPER_MOVEMENT_DECODER_H
#define STEPPER_MOVEMENT_DECODER_H

#include "./StepperMovementCommand.h"


class StepperMovementCommandDecoder: public ByteStepDecoder<StepperMovementCommand> {
  public:
    StepperMovementCommandDecoder() {

    }

    ~StepperMovementCommandDecoder() {
      std::cout << RED_TERMINAL("delete StepperMovementCommandDecoder\n");
    }

    StepperMovementCommandDecoder * init() {
      return (StepperMovementCommandDecoder *) ByteStepDecoder<StepperMovementCommand>::init();
    }

  protected:
    Uint8Array * _bytes;
    uint32_t _index;
    uint8_t _moveIndex;

    void _next(uint8_t value) {
      while(true) {
//      std::cout << "StepperMovementCommandDecoder - step: " << this->_step << "\n";

        switch(this->_step) {
          case 0: // init
            this->_output = new StepperMovementCommand();
            this->_step = 1;
            return;

          case 1: // pinMask
            for(uint8_t i = 0; i < 8; i++) {
              if(value & (1 << i)) {
                this->_output->moves.push_back(new StepperMove(i, 0));
              }
            }
            this->_bytes = new Uint8Array(8);
            this->_index = 0;
            this->_step = 2;

          case 2: // duration
            if(this->_index >= this->_bytes->length) {
              this->_output->duration = ((double *) (this->_bytes->buffer))[0];
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

          case 4: // initialSpeed
            if(this->_index >= this->_bytes->length) {
              this->_output->initialSpeed = ((double *) (this->_bytes->buffer))[0];
              this->_index = 0;
              this->_step = 6;
              break;
            } else {
              this->_step = 5;
              return;
            }
          case 5:
            this->_bytes->buffer[this->_index++] = value;
            this->_step = 4;
            break;

          case 6: // acceleration
            if(this->_index >= this->_bytes->length) {
              this->_output->acceleration = ((double *) (this->_bytes->buffer))[0];
              this->_moveIndex = 0;
              this->_step = 8;
              break;
            } else {
              this->_step = 7;
              return;
            }
          case 7:
            this->_bytes->buffer[this->_index++] = value;
            this->_step = 6;
            break;

          case 8: // movements
            if(this->_moveIndex >= this->_output->moves.size()) {
              this->_done = true;
              delete this->_bytes;
              return;
            } else {
              delete this->_bytes;
              this->_bytes = new Uint8Array(4);
              this->_index = 0;
              this->_step = 9;
            }

          case 9: // movement distance
            if(this->_index >= this->_bytes->length) {
              this->_output->moves[this->_moveIndex]->target = ((int32_t *) (this->_bytes->buffer))[0];
              this->_moveIndex++;
              this->_step = 8;
              break;
            } else {
              this->_step = 10;
              return;
            }
          case 10:
            this->_bytes->buffer[this->_index++] = value;
            this->_step = 9;
            break;

          default:
            THROW_ERROR("StepperMovementCommandDecoder - Unexpected step : " + std::to_string(this->_step));
            return;
        }
      }
    }
};


#endif