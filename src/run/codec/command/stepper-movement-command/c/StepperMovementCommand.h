#ifndef STEPPER_MOVEMENT_H
#define STEPPER_MOVEMENT_H

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

    uint8_t pinMask() {
      return 1 << this->pin;
    }

    void print() {
      std::cout << "StepperMove: pin (" << (uint32_t) this->pin << "), target (" << this->target << ")" << "\n";
    }
};

class StepperMovementCommand {
  public:
    std::vector<StepperMove *> moves;
    double duration;
    double initialSpeed;
    double acceleration;
    double initialTime;

    StepperMovementCommand() {
      this->duration = 0;
      this->initialSpeed = 0;
      this->acceleration = 0;
      this->initialTime = 0;
    }

    ~StepperMovementCommand() {
      std::cout << RED_TERMINAL("delete StepperMovementCommand\n");
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

    StepperMovementCommand * start() {
      this->initialTime = GetTime();
      return this;
    }

    void print() {
      std::cout << "StepperMovementCommand: duration ("
      << this->duration << "), initialSpeed ("
      << this->initialSpeed << "), acceleration ("
      << this->acceleration << ")" << "\n";
      for(std::vector<StepperMove *>::iterator it = this->moves.begin(); it != this->moves.end(); ++it) {
        (*it)->print();
      }
    }
};


#endif