#include <nan.h>

#include <cmath>
#include <ctime>
#include <queue>
#include <iostream>


#define RASPBERRY


#include "classes/TypedArray.h"
#include "classes/SharedBufferStream.h"
#include "classes/codec/codec.h"
#include "classes/GPIOController.h"



//#define math_max(x, y) ((x > y) ? x : y)
//#define math_min(x, y) ((x < y) ? x : y)
//#define math_abs(x) ((x < 0) ? -x : x)
#define math_sign(x) ((x < 0) ? (-1) : ((x > 0) ? 1 : 0))
//#define math_floor(x) ((x < 0) ? (-1) : ((x > 0) ? 1 : 0))

// http://www.ti.com/lit/ds/symlink/drv8825.pdf
// step freqency  max : 250Khz (2us HIGH, 2us LOW)

double GetTime() {
  return ((double) std::clock()) / CLOCKS_PER_SEC;
}


/***
    StepperMovement
****/


class StepperMove {
  public:
    uint8_t pin;
    int32_t target;
    int32_t current;

    StepperMove(uint8_t pin,
                int32_t target,
                uint32_t current = 0) {
      this->pin = pin;
      this->target = target;
      this->current = current;
    }

    int8_t sign() {
      return math_sign(this->target);
    }

    uint32_t distance() {
      return std::abs(this->target);
    }

    bool finished()  {
      return this->current >= std::abs(this->target);
    }

    uint8_t pinMask() {
      return 1 << this->pin;
    }

    void print() {
      std::cout << "move #" << (uint32_t) this->pin << " : " << this->target << "\n";
    }
};


class StepperMovement {
  public:
    std::vector<StepperMove *> moves;
    double duration;
    double initialSpeed;
    double acceleration;
    double initialTime;

    StepperMovement() {
      this->duration = 0;
      this->initialSpeed = 0;
      this->acceleration = 0;
      this->initialTime = 0;
    }

    ~StepperMovement() {
//      std::cout << "delete StepperMovement\n";
      for(std::vector<StepperMove *>::iterator it = this->moves.begin(); it != this->moves.end(); ++it) {
        delete (*it);
      }
    }

    uint8_t pinMask() {
      uint8_t pinMask = 0;
      for(std::vector<StepperMove *>::iterator it = this->moves.begin(); it != this->moves.end(); ++it) {
        pinMask |= (*it)->pinMask();
      }
      return pinMask;
    }

    StepperMovement * start() {
      this->initialTime = GetTime();
      return this;
    }

    void print() {
      std::cout << "t: " << this->duration << ", ";
      std::cout << "s: " << this->initialSpeed << ", ";
      std::cout << "a: " << this->acceleration << ", ";
      std::cout << "\n";
      for(std::vector<StepperMove *>::iterator it = this->moves.begin(); it != this->moves.end(); ++it) {
        (*it)->print();
      }
    }
};


class StepperMovementDecoder: public ByteStepDecoder<StepperMovement> {
  public:
    StepperMovementDecoder() {
      this->_output = new StepperMovement();
      this->_init();
    }

    ~StepperMovementDecoder() {
      // delete this->_output;
    }

  protected:
    Uint8Array * _bytes;
    uint32_t _index;
    uint8_t _moveIndex;

    void _next(uint8_t value) {
      while(true) {
//      std::cout << "step: " << this->_step << "\n";

        switch(this->_step) {
          case 0: // init
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
//            throw std::logic_error("Unexpected step : " + this->_step);
            Nan::ThrowError("Unexpected step : " + this->_step);
            return;
        }
      }
    }
};




/***
    PWM
****/
class PWM {
  public:
    double value;
    double period; // in seconds

    PWM(double value = 0, double period = 1) {
      this->value = value;
      this->period = period;
    }

    bool isActive(double time = GetTime()) {
      return std::fmod(time, this->period) < (this->value * this->period);
    }

    uint8_t getState(double time = GetTime()) {
      return this->isActive(time) ? 1 : 0;
    }
};



#define STEPPERS_STEP_REG 0
#define STEPPERS_DIRECTION_REG 1
#define STEPPERS_ENABLED_REG 2
#define PWM_REG 3

#define GPIO_CS_PIN PINMAP_40[6] // pin #7
#define GPIO_PL_PIN PINMAP_40[10] // pin #11
#define GPIO_GROUP_SIZE 6

#define PWM_CHANELS 8

class AGCODERunner {
public:
  GPIOController * gpioController;
  SharedBufferStream * sharedArray;

  StepperMovement * currentMove;
  std::queue<StepperMovement *> moveStack;
  bool stepping;
  double stepTime;

  PWM * pwm[PWM_CHANELS];

//  public loopTime = { sum: 0, max: 0, min: Infinity, iter: 0 };
  uint32_t runOutOfTime = 0;
  uint32_t missedSteps = 0;

  AGCODERunner() {
    this->gpioController = nullptr;

    this->currentMove = nullptr;
    this->stepping = false;
    this->stepTime = 0;


    for(uint8_t i = 0; i < PWM_CHANELS; i++) {
      this->pwm[i] = nullptr;
    }

    this->sharedArray = SharedBufferStream::create();

    this->initGPIO();
    this->stopAll();

    this->addPWM(0, new PWM(0.5, 1e-5));
  }

  ~AGCODERunner() {
    this->stopAll();
    delete this->gpioController;
    delete this->sharedArray;
  }

  void start() {
    this->enableSteppers(0b11111111);

    while(true) {
      double time = GetTime();

      this->updateCommands();

      if((time - this->stepTime) > 2e-6) { // max frequency: 250kHz
        this->stepTime = time;
        this->updateMovement(time);
      }

      this->updatePWM(time);
      this->gpioController->update();

//      std::cout << "loopTime : " << loopTime << "\n";
    }
  }

  void updateCommands() {
    if(this->sharedArray->readable()) {
      this->sharedArray->receive();
      std::cout << "receive\n";
//      this->sharedArray->buffer->print(0, 10);

      Uint8Array * data = this->sharedArray->data();
//      data->print(0, 20);

      StepperMovementDecoder * decoder = nullptr;

      for(uint32_t i = 0; i < data->length; i++) {
        switch(data->buffer[i]) {
          case 0x10:

            decoder = new StepperMovementDecoder();
            while(!decoder->done()) {
              i++;
              decoder->next(data->buffer[i]);
            }
            this->moveStack.push(decoder->output());
            decoder->output()->print();
            break;
          default:
            Nan::ThrowError("Unexpected command code 0x" + data->buffer[i]);
            return;
        }
      }

      delete decoder;

      this->sharedArray->send();
    }
  }


  void updateMovement(double time) {
    if(this->stepping) { //if we are stepping, invert step register
      this->gpioController->outBuffer[STEPPERS_STEP_REG] = 0b00000000;
      this->stepping = false;
    } else {
      if(this->currentMove != nullptr) { // if a move is available
        double elapsedTime = time - this->currentMove->initialTime;
        double positionFactor = (
          this->currentMove->acceleration * elapsedTime * elapsedTime * 0.5 +
          this->currentMove->initialSpeed * elapsedTime
        );

        uint8_t stepsByte = 0;
        uint8_t directionByte = 0;

        bool finished = true;

        StepperMove * _move;
        for(std::vector<StepperMove *>::iterator it = this->currentMove->moves.begin(); it != this->currentMove->moves.end(); ++it) {
          _move = (*it);

          if(_move != nullptr) {
            if(_move->current < std::abs(_move->target)) { // !move.finished
              finished = false;

              if(elapsedTime > this->currentMove->duration) this->runOutOfTime++;
              if((std::abs(std::round(positionFactor * _move->target)) - _move->current) > 1) this->missedSteps++;

              if(
                (elapsedTime > this->currentMove->duration)
                || ((std::abs(std::round(positionFactor * _move->target)) - _move->current) > 0)
              ) { // must step
                _move->current++;
                stepsByte |= 1 << _move->pin;
                if(_move->target > 0) directionByte |= 1 << _move->pin;
              }
            }
          }
        }

        this->gpioController->outBuffer[STEPPERS_STEP_REG] = stepsByte;
        this->gpioController->outBuffer[STEPPERS_DIRECTION_REG] = directionByte;
        this->stepping = true;

        if(finished) {
          // console.log(this->currentMove.duration, elapsedTime, positionFactor);
          delete this->currentMove;
          this->currentMove = nullptr;
          std::cout << "end a move\n";
          std::cout << this->missedSteps << ", " << this->runOutOfTime << "\n";
        }
      }

      if((this->currentMove == nullptr) && (!this->moveStack.empty())) {
        this->currentMove = this->moveStack.front();
        this->moveStack.pop();
        this->currentMove->initialTime = time;
      }
    }
  }

  void updatePWM(double time) {
    uint8_t mask = 0b00000000;
    for(uint8_t i = 0; i < PWM_CHANELS; i++) {
      if(this->pwm[i] != nullptr) {
        mask |= (this->pwm[i]->getState(time) << i);
      }
    }
    this->gpioController->outBuffer[PWM_REG] = mask;
  }


  void updateEndStops() {

  }


  void stopAll() {
    delete this->currentMove;
    this->currentMove = nullptr;

    this->stepping = false;

    while(!this->moveStack.empty()) {
      delete this->moveStack.front();
      this->moveStack.pop();
    }

    for(uint8_t i = 0; i < PWM_CHANELS; i++) {
      delete this->pwm[i];
      this->pwm[i] = nullptr;
    }

    this->enableSteppers(0b00000000);
  }

  void addMovement(StepperMovement * movement) {
    this->moveStack.push(movement);
  }

  void addPWM(uint8_t pin, PWM * pwm) {
    delete this->pwm[pin];
    this->pwm[pin] = pwm;
  }


  void enableSteppers(uint8_t mask) {
    this->gpioController->outBuffer[STEPPERS_ENABLED_REG] = ~mask;
  }

protected:
  void initGPIO() {
    GPIOController::init();

    this->gpioController = new GPIOController(
      GPIO_CS_PIN,
      GPIO_PL_PIN,
      GPIO_GROUP_SIZE
    );
  }
};


//int main() {
//  AGCODERunner * runner = new AGCODERunner();
//  runner->start();
//  return 0;
//}



// https://nodejs.org/api/addons.html#
// https://blog.risingstack.com/writing-native-node-js-modules/
// https://github.com/nodejs/node-gyp

//void Method(const v8::FunctionCallbackInfo<v8::Value>& args) {
//  v8::Isolate* isolate = args.GetIsolate();
//  args.GetReturnValue().Set(v8::String::NewFromUtf8(isolate, "world"));
//}

NAN_METHOD(startRunner) {
  AGCODERunner * runner = new AGCODERunner();
  runner->start();

  delete runner;
}

NAN_MODULE_INIT(Initialize) {
  NAN_EXPORT(target, startRunner);
}

NODE_MODULE(sharedbuffer, Initialize)