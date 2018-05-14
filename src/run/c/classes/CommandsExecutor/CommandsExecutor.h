#ifndef COMMANDS_EXECUTOR_H
#define COMMANDS_EXECUTOR_H

#include "../CommandsDecoder/CommandsDecoder.h"
#include "../GPIOController/GPIOController.h"
#include "../SteppersController/SteppersController.h"



#define GPIO_CS_PIN PINMAP_40[6] // pin #7
#define GPIO_PL_PIN PINMAP_40[10] // pin #11
#define GPIO_GROUP_SIZE 6

// TODO continue here
class CommandsExecutor {
  public:
    CommandsDecoder decoder;

    GPIOController * gpioController;
    SteppersController * steppersController;

    Command * currentCommand;

    CommandsExecutor() {
      this->initGPIO();
      this->steppersController = new SteppersController(this->gpioController);

      this->currentCommand = nullptr;
    }

    ~CommandsExecutor() {
      std::cout << RED_TERMINAL("delete CommandsExecutor\n");
      delete (this->gpioController);
      delete (this->steppersController);
    }

    void start() {
      while(true) {
        double time = GetTime();

        this->steppersController->updateMovement(time);

        if (this->currentCommand != nullptr) {
          if ((this->currentCommand->id == CMD_MOVE) && (this->steppersController->currentMove == nullptr)) { // finished move
            delete (this->currentCommand);
            this->currentCommand = nullptr;
          }
        }


        this->decoder.update();

        // TODO execute immediate commands
        if (this->currentCommand == nullptr) {
          if (this->decoder.commands.size() > 0) { // new command detected
            this->currentCommand = this->decoder.commands.front();
            this->decoder.commands.pop();

            if (this->currentCommand->id == CMD_MOVE) {
              this->steppersController->startMovement((StepperMovement *) (this->currentCommand->command), time);
            }
          }
        }

        this->gpioController->update();

  //      std::cout << "loopTime : " << loopTime << "\n";
      }
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