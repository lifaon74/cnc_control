#ifndef PWM_CONTROLLER_H
#define PWM_CONTROLLER_H

#include "../GPIOController/GPIOController.h"

#define PWM_REG 3
#define PWM_CHANNELS 8

class PWMController {
  public:
    GPIOController * gpioController;
    PWMCommand * pwm[PWM_CHANNELS];
    bool autoFree;

    PWMController(GPIOController * gpioController, bool autoFree = false) {
      this->gpioController = gpioController;
      this->autoFree = autoFree;

      for(uint8_t i = 0; i < PWM_CHANNELS; i++) {
        this->pwm[i] = nullptr;
      }
    }

    ~PWMController() {
      std::cout << RED_TERMINAL("delete PWMController\n");
      if (this->autoFree) {
        for(uint8_t i = 0; i < PWM_CHANNELS; i++) {
          delete this->pwm[i];
        }
      }
    }

    void addPWM(PWMCommand * pwm) {
      if (this->autoFree) {
        delete this->pwm[pwm->pin];
      }
      this->pwm[pwm->pin] = pwm;
    }

    void updatePWM(double time) {
      uint8_t mask = 0b00000000;
      for(uint8_t i = 0; i < PWM_CHANNELS; i++) {
        if(this->pwm[i] != nullptr) {
          mask |= (this->pwm[i]->getState(time) << i);
        }
      }
      this->gpioController->outBuffer[PWM_REG] = mask;
    }
};


#endif