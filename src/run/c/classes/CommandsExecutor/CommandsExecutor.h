#ifndef COMMANDS_EXECUTOR_H
#define COMMANDS_EXECUTOR_H

#include "../CommandsDecoder/CommandsDecoder.h"
#include "../GPIOController/GPIOController.h"
#include "../SteppersController/SteppersController.h"
#include "../PWMController/PWMController.h"


#define GPIO_CS_PIN PINMAP_40[6] // pin #7
#define GPIO_PL_PIN PINMAP_40[10] // pin #11
#define GPIO_GROUP_SIZE 6

// TODO continue here
// CommandsInterpreter
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
            this->finishCurrentCommand(new Answer(this->currentCommand->id, CMD_MOVE, 0, nullptr));
          }
        }


        this->decoder.update();

        // TODO execute immediate commands
        if (this->currentCommand == nullptr) {
          if (this->decoder.commands.size() > 0) { // new command detected
            this->currentCommand = this->decoder.popCommand();

            switch (this->currentCommand->code) {
              case CMD_READ_INPUTS:
//            InputsStateAnswer * inputsState = new InputsStateAnswer(0b01100011 /* 99 */, new Uint16Array({0, 1, 2, 3, 4, 5, 6, 7}));
//              Answer * ans = new Answer(123, CMD_READ_INPUTS, 0, inputsState);
                break;
              case CMD_PWM:
                std::cout << "new pwm" << "\n";
                this->pwmController->addPWM((PWMCommand *) (this->currentCommand->command));
                this->finishCurrentCommand(new Answer(this->currentCommand->id, CMD_PWM, 0, nullptr));
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

    void finishCurrentCommand(Answer * answer) {
      this->deleteCurrentCommand();
      this->decoder.pushAnswer(answer);
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