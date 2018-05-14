#ifndef COMMANDS_EXECUTOR_H
#define COMMANDS_EXECUTOR_H

#include "../CommandsDecoder/CommandsDecoder.h"
#include "../GPIOController/GPIOController.h"


#define STEPPERS_STEP_REG 0
#define STEPPERS_DIRECTION_REG 1
#define STEPPERS_ENABLED_REG 2
#define STEPPERS_MIN_UPDATE_TIME 0.000002 // max frequency: 250kHz => (1 / 250000) / 2 = 2e-6


class SteppersController {
  public:
    GPIOController * gpioController;

    StepperMovement * currentMove;
    bool stepping;
    double stepTime;

    uint32_t runOutOfTime = 0;
    uint32_t missedSteps = 0;

    SteppersController(GPIOController * gpioController) {
      this->gpioController = gpioController;
      this->currentMove = nullptr;
      this->stepping = false;
      this->stepTime = 0;
    }

    ~SteppersController() {
      std::cout << RED_TERMINAL("delete SteppersController\n");
      delete (this->currentMove);
    }

    void startMovement(StepperMovement * move, double time) {
       this->currentMove = move;
       this->currentMove->initialTime = time;
    }

    void updateMovement(double time) {
      if((time - this->stepTime) > STEPPERS_MIN_UPDATE_TIME) {
        this->stepTime = time;
        this->updateMovement(time);
      }
    }

    void enableSteppers(uint8_t mask) {
      this->gpioController->outBuffer[STEPPERS_ENABLED_REG] = ~mask;
    }


  protected:

    void _updateMovement(double time) {
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
            delete this->currentMove;
            this->currentMove = nullptr;
            std::cout << "end a move\n";
            std::cout << this->missedSteps << ", " << this->runOutOfTime << "\n";
          }
        }

//        if((this->currentMove == nullptr) && (this->nextMove != nullptr)) {
//          this->currentMove = this->nextMove;
//          this->nextMove = nullptr;
//          this->currentMove->initialTime = time;
//        }
      }
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