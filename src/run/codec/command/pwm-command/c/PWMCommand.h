#ifndef PWM_COMMAND_H
#define PWM_COMMAND_H

//#include "../../../c/snippets/snippets.h"

class PWMCommand {
  public:
    uint8_t pin;
    double value;
    double period; // in seconds

    PWMCommand(uint8_t pin = 0, double value = 0, double period = 1) {
      this->pin = pin;
      this->value = value;
      this->period = period;
    }

    ~PWMCommand() {
      std::cout << RED_TERMINAL("delete PWMCommand\n");
    }

    bool isActive(double time = GetTime()) {
      return std::fmod(time, this->period) < (this->value * this->period);
    }

    uint8_t getState(double time = GetTime()) {
      return this->isActive(time) ? 1 : 0;
    }

    void print() {
      std::cout << "PWMCommand: pin (" << (uint32_t) this->pin << "), value (" << this->value << "), period (" << this->period << ")" << "\n";
    }
};

#endif