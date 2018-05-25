#ifndef ANSWER_H
#define ANSWER_H

#include "../../codes/c/codes.h"
#include "../inputs-state-answer/c/InputsStateAnswerEncoder.h"

// cast a $command (Command) to its type
// $pre : code before the casting
// $post : code after the casting
// $command : the command (Command) to cast (actually, cast the $command->command)
#define CAST_ANSWER($pre, $answer, $post) \
  switch ($answer->code) { \
    case CMD_READ_INPUTS: \
      $pre ((InputsStateAnswer *)($answer->answer)) $post; \
      break; \
    default: \
      THROW_ERROR("Answer - Unexpected $answer code : " + std::to_string($answer->code)); \
      return; \
  }


#define DELETE_ANSWER($command) CAST_ANSWER(delete , $command,);

class Answer {
  public:
    uint16_t id;
    uint8_t code;
    uint8_t state;
    void * answer;

    Answer(uint16_t id = 0, uint8_t code = 0, uint8_t state = 0, void * answer = nullptr) {
      this->id = id;
      this->code = code;
      this->state = state;
      this->answer = answer;
    }

    ~Answer() {
      std::cout << RED_TERMINAL("delete Answer\n");
      DELETE_ANSWER(this);
    }

    void print() {
      std::cout << "Answer: id (" << (uint32_t) this->id << "), code (" << (uint32_t) this->code << "), state (" << (uint32_t) this->state << ")" << "\n";
    }

    bool immediate() {
      return (this->id & 0x8000) != 0;
    }
};



#endif