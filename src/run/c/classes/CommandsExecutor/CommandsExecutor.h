#ifndef COMMANDS_EXECUTOR_H
#define COMMANDS_EXECUTOR_H

#include "../CommandsDecoder/CommandsDecoder.h"
#include "../GPIOController/GPIOController.h"
#include "../SteppersController/SteppersController.h"


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



#define GPIO_CS_PIN PINMAP_40[6] // pin #7
#define GPIO_PL_PIN PINMAP_40[10] // pin #11
#define GPIO_GROUP_SIZE 6

// TODO continue here
class CommandsExecutor {
  public:
    CommandsDecoder decoder;

    GPIOController * gpioController;
    SteppersController * steppersController;
    PWMController * pwmController;

    Command * currentCommand;

    CommandsExecutor() {
      this->initGPIO();
      this->steppersController = new SteppersController(this->gpioController);
      this->pwmController = new PWMController(this->gpioController);

      this->currentCommand = nullptr;
    }

    ~CommandsExecutor() {
      std::cout << RED_TERMINAL("delete CommandsExecutor\n");
      delete (this->gpioController);
      delete (this->steppersController);
      delete (this->pwmController);
    }

    void start() {
      while(true) {
        double time = GetTime();

        this->steppersController->updateMovement(time);

        if (this->currentCommand != nullptr) {
          if ((this->currentCommand->code == CMD_MOVE) && (this->steppersController->currentMove == nullptr)) { // finished move
            this->deleteCurrentCommand();
          }
        }


        this->decoder.update();

        // TODO execute immediate commands
        if (this->currentCommand == nullptr) {
          if (this->decoder.commands.size() > 0) { // new command detected
            this->currentCommand = this->decoder.commands.front();
            this->decoder.commands.pop();

            switch (this->currentCommand->code) {
              case CMD_PWM:
                std::cout << "new pwm" << "\n";
                this->pwmController->addPWM((PWMCommand *) (this->currentCommand->command));
                this->deleteCurrentCommand();
                break;
              case CMD_MOVE:
                std::cout << "startMovement" << "\n";
                this->steppersController->startMovement((StepperMovementCommand *) (this->currentCommand->command), time);
                break;
            }
          }
        }

        this->gpioController->update();

  //      std::cout << "loopTime : " << loopTime << "\n";
      }
    }

    void deleteCurrentCommand() {
      delete (this->currentCommand);
      this->currentCommand = nullptr;
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



#endif