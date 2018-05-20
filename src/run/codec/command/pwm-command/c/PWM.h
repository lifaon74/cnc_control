#ifndef PWM_H
#define PWM_H

//#include "../../../c/snippets/snippets.h"

class PWM {
  public:
    uint8_t pin;
    double value;
    double period; // in seconds

    PWM(uint8_t pin = 0, double value = 0, double period = 1) {
      this->pin = pin;
      this->value = value;
      this->period = period;
    }

    ~PWM() {
      std::cout << RED_TERMINAL("delete PWM\n");
    }

    bool isActive(double time = GetTime()) {
      return std::fmod(time, this->period) < (this->value * this->period);
    }

    uint8_t getState(double time = GetTime()) {
      return this->isActive(time) ? 1 : 0;
    }

    void print() {
      std::cout << "PWM: pin (" << (uint32_t) this->pin << "), value (" << this->value << "), period (" << this->period << ")" << "\n";
    }
};

#endif