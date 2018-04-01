#ifndef PWM_H
#define PWM_H

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

#endif