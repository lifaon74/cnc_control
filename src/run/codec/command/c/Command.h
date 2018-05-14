#ifndef COMMAND_H
#define COMMAND_H

#define CMD_STOP 0x00
#define CMD_PAUSE 0x01
#define CMD_RESUME 0x02
#define CMD_SET_PRECISION 0x03
#define CMD_GET_CAPABILITIES 0x04
#define CMD_READ_INPUTS 0x05
#define CMD_DEFINE ENDSTOPS 0x06
#define CMD_HOME 0x07
#define CMD_PWM 0x08
#define CMD_ENABLE_STEPPERS 0x09
#define CMD_MOVE 0x0A

#include "../../pwm/c/PWM.h"
#include "../../stepper-movement/c/StepperMovement.h"

// cast a $command (Command) to its type
// $pre : code before the casting
// $post : code after the casting
// $command : the command (Command) to cast (actually, cast the $command->command)
#define CAST_COMMAND($pre, $command, $post) \
  switch ($command->code) { \
    case CMD_PWM: \
      $pre ((PWM *)($command->command)) $post; \
      break; \
    case CMD_MOVE: \
      $pre ((StepperMovement *)($command->command)) $post; \
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
      std::cout << RED_TERMINAL("delete Command\n");
      DELETE_COMMAND(this);
    }

    void print() {
      std::cout << "Command: id (" << (uint32_t) this->id << "), code (" << (uint32_t) this->code << ")" << "\n";
    }
};



#endif