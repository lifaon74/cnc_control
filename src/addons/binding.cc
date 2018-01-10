#include <nan.h>

#include <cmath>
#include <ctime>
#include <queue>
#include <iostream>

#include <sys/ipc.h>
#include <sys/shm.h>


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


template<typename T>
class TypedArray {
  public:
    T * buffer;
    uint32_t length;
    bool autoFree;

    TypedArray(uint32_t length) {
      this->length = length;
      this->buffer = new T[this->length];
      this->autoFree = true;
    }

    TypedArray(uint32_t length, T * buffer) {
      this->length = length;
      this->buffer = buffer;
      this->autoFree = false;
    }

    ~TypedArray() {
      if(this->autoFree) {
        delete [] (buffer);
      }
    }

    T& operator[] (const uint32_t index) {
      return this->buffer[index];
    }

    TypedArray * subarray(uint32_t start, uint32_t end) {
      return new TypedArray(end - start, this->buffer + start);
    }

    void set(TypedArray * array, uint32_t offset = 0) {
      for(uint32_t i = 0; i < array->length; i++) {
        this->buffer[i + offset] = array->buffer[i];
      }
    }

    void print() {
      this->print(0, this->length);
    }

    void print(uint32_t start, uint32_t end) {
      for(uint32_t i = 0; i < end; i++) {
        if(i > 0) std::cout << ", ";
        std::cout << (double) this->buffer[i];
      }
      std::cout << "\n";
    }
};

#define Uint8Array TypedArray<uint8_t>
#define Int8Array TypedArray<int8_t>


Uint8Array * createSharedBuffer(uint32_t key, uint32_t size, bool initialize = false) {
  int32_t shmId = shmget(key, size, initialize ? IPC_CREAT | 0666 : 0666);

  if (shmId < 0) {
    Nan::ThrowError(strerror(errno));
    return nullptr;
  }


  uint8_t * data = (uint8_t *) shmat(shmId, NULL, 0);

  if (data == (uint8_t *)-1) {
    Nan::ThrowError(strerror(errno));
    return nullptr;
  }

  if (initialize) {
    memset(data, 0, size);
  }

  return new Uint8Array(size, data);
}


/***
    SharedBufferStream
****/
class SharedBufferStream {
  public:
    static uint32_t ID;

    static const uint8_t PACKET_ID_REG = 0;
    static const uint8_t PACKET_SIZE_REG = 1;
    static const uint8_t START_OFFSET = 5;

    static SharedBufferStream * createMaster(uint32_t size = 1e6, uint32_t id = SharedBufferStream::ID++) {
      SharedBufferStream * sharedBuffer = new SharedBufferStream(createSharedBuffer(id, size, true));
      sharedBuffer->packetId = 255;
      return sharedBuffer;
    }

    static SharedBufferStream * create(uint32_t size = 1e6, uint32_t id = SharedBufferStream::ID++) {
      return new SharedBufferStream(createSharedBuffer(id, size));
    }

    Uint8Array * buffer;
    uint8_t packetId;

    SharedBufferStream(Uint8Array * buffer) {
      this->buffer = buffer;
      this->packetId = 0;
      std::cout << "SharedBufferStream:" << (uint32_t) this->buffer->buffer[0] << "\n";
    }

    ~SharedBufferStream() {
      std::cout << "destroy SharedBufferStream:" << "\n";
      delete this->buffer;
    }

    bool readable() {
      return (this->buffer->buffer[SharedBufferStream::PACKET_ID_REG]) != this->packetId;
    }

    uint32_t size() {
      return (
        (uint32_t) (this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG    ])
        | (uint32_t) ((this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 1] << 8))
        | (uint32_t) ((this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 2] << 16))
        | (uint32_t) ((this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 3] << 24))
      );
    }

    void size(uint32_t value) {
      this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG    ] = value;
      this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 1] = value >> 8;
      this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 2] = value >> 16;
      this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 3] = value >> 24;
    }

    uint32_t maxSize() {
      return this->buffer->length - SharedBufferStream::START_OFFSET;
    }

    Uint8Array * data() {
      return this->buffer->subarray(SharedBufferStream::START_OFFSET, SharedBufferStream::START_OFFSET + this->size());
    }

    void data(Uint8Array * value) {
      this->size(value->length);
      this->buffer->set(value, SharedBufferStream::START_OFFSET);
    }

    void receive() {
      this->packetId = this->buffer->buffer[SharedBufferStream::PACKET_ID_REG];
    }

    void send() {
      this->packetId++;
      this->buffer->buffer[SharedBufferStream::PACKET_ID_REG] = this->packetId;
    }
};

uint32_t SharedBufferStream::ID = 10;



/***
    GPIOController
****/

class GPIOController {
  public:
//  static init(): void {
//    rpio.init({
//      gpiomem: false,
//      mapping: 'physical'
//    });
//
//    rpio.spiBegin();
//    rpio.spiSetClockDivider(16);
//  }

  uint8_t csPin;
  uint8_t plPin;
  uint8_t length;

  uint8_t * outBuffer;
  uint8_t * inBuffer;

  GPIOController(uint8_t csPin, uint8_t plPin, uint8_t length) {
    this->csPin      = csPin;
    this->plPin      = plPin;
    this->length     = length;
    this->outBuffer  = new uint8_t[length];
    this->inBuffer   = new uint8_t[length];

//    rpio.open(this->csPin, rpio.OUTPUT, rpio.HIGH);
//    rpio.open(this->plPin, rpio.OUTPUT, rpio.HIGH);
  }

  ~GPIOController() {
    delete [] this->outBuffer;
    delete [] this->inBuffer;
  }

  uint8_t pinCount() {
    return this->length * 8;
  }

  bool read(uint8_t pin) {
    return (this->inBuffer[pin / 8] & (1 << (pin % 8))) != 0;
  }

  void write(uint8_t pin, bool state) {
    if(state) {
      this->outBuffer[pin / 8] |= (1 << (pin % 8));
    } else {
      this->outBuffer[pin / 8] &= ~(1 << (pin % 8));
    }
  }

  void update() {
    // console.log('update', Array.from(this->outBuffer).map(_ => _.toString(2)).join(', '));
    // console.log('update', Array.from(this->inBuffer).map(_ => _.toString(2)).join(', '));
//    rpio.write(this->plPin, rpio.LOW);
//    rpio.write(this->plPin, rpio.HIGH);
//    rpio.write(this->csPin, rpio.LOW);
//    rpio.spiTransfer(this->outBuffer, this->inBuffer, this->outBuffer.length);
//    rpio.write(this->csPin, rpio.HIGH);
  }
};



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


class Iterator {
  public:
    Iterator() {
      this->_done = false;
    }

    bool done() {
      return this->_done;
    }

  protected:
    bool _done;

    void throwIfDone() {
      if(this->done()) Nan::ThrowError("Iterator is done");
    }
};


template<typename T>
class ByteDecoder: public Iterator {
  public:
    ByteDecoder() {
      this->_output = nullptr;
    }

    T * output() {
      return this->_output;
    }

    virtual void next(uint8_t value) = 0;

  protected:
    T * _output;
};

template<typename T>
class ByteStepDecoder: public ByteDecoder<T> {
  public:

    ByteStepDecoder() {
      this->_step = 0;
    }

    virtual ~ByteStepDecoder() {}

    void next(uint8_t value) override {
      this->throwIfDone();
      this->_next(value);
    }

  protected:
    uint32_t _step;

    void _init() {
      this->_next(0);
    }

    virtual void _next(uint8_t value) = 0;
};

class StepperMovementDecoder: public ByteStepDecoder<StepperMovement> {
  public:
    StepperMovementDecoder() {
      this->_output = new StepperMovement();
      this->_init();
    }

    ~StepperMovementDecoder() {
//      delete this->_output;
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
    double period;

    PWM(double value, double period) {
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

#define GPIO_CS_PIN 7
#define GPIO_PL_PIN 11
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

    this->addPWM(new PWM(0.5, 1e-5));
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
    if(this->stepping) {
      this->gpioController->outBuffer[STEPPERS_STEP_REG] = 0b00000000;
      this->stepping = false;
    } else {
      if(this->currentMove != nullptr) {
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
//    GPIOController.init();

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