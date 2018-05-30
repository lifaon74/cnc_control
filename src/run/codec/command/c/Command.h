#ifndef COMMAND_H
#define COMMAND_H


#include "../../codes/c/codes.h"
#include "../pwm-command/c/PWMCommand.h"
#include "../stepper-movement-command/c/StepperMovementCommand.h"

// cast a $command (Command) to its type
// $pre : code before the casting
// $post : code after the casting
// $command : the command (Command) to cast (actually, cast the $command->command)
#define CAST_COMMAND($pre, $command, $post) \
  switch ($command->code) { \
    case CMD_PWM: \
      $pre ((PWMCommand *)($command->command)) $post; \
      break; \
    case CMD_MOVE: \
      $pre ((StepperMovementCommand *)($command->command)) $post; \
      break; \
    default: \
      THROW_ERROR("Command - Unexpected command code : " + std::to_string($command->code)); \
      return; \
  }

#define DELETE_COMMAND($command) CAST_COMMAND(delete , $command,);

class Command {
  public:
    uint16_t id;
    uint8_t code;
    void * command;

    Command(uint16_t id = 0, uint8_t code = 0, void * command = nullptr) {
      this->id = id;
      this->code = code;
      this->command = command;
    }

    ~Command() {
//      std::cout << RED_TERMINAL("delete Command\n");
      if (this->command != nullptr) {
        DELETE_COMMAND(this);
      }
    }

    void print() {
      std::cout << "Command: id (" << (uint32_t) this->id << "), code (" << (uint32_t) this->code << ")" << "\n";
    }

    bool immediate() {
      return (this->id & 0x8000) != 0;
    }
};



#endif