#ifndef ANSWER_H
#define ANSWER_H

#include "../../codes/c/codes.h"
#include "../inputs-state-answer/c/InputsStateAnswerEncoder.h"

// cast an $answer (Answer) to its type
// $pre : code before the casting
// $post : code after the casting
// $answer : the answer (Answer) to cast (actually, cast the $answer->answer)
#define CAST_ANSWER($pre, $answer, $post) \
  switch ($answer->code) { \
    case CMD_READ_INPUTS: \
      $pre ((InputsStateAnswer *)($answer->answer)) $post; \
      break; \
    default: \
      THROW_ERROR("Answer - Unexpected $answer code : " + std::to_string($answer->code)); \
      return; \
  }


#define DELETE_ANSWER($answer) CAST_ANSWER(delete , $answer,);

class Answer {
  public:
    uint16_t id;
    uint8_t code;
    uint8_t state;
    void * answer;

    Answer(uint16_t id = 0, uint8_t code = 0, uint8_t state = 0, void * answer = nullptr) {
//      std::cout << "create Answer " << std::addressof(*this) << "\n";
      this->id = id;
      this->code = code;
      this->state = state;
      this->answer = answer;
    }

    ~Answer() {
//      std::cout << RED_TERMINAL("delete Answer\n");
//      std::cout << std::addressof(*this) << "\n";
      if (this->answer != nullptr) {
        DELETE_ANSWER(this);
      }
    }

    void print() {
      std::cout << "Answer: id (" << (uint32_t) this->id << "), code (" << (uint32_t) this->code << "), state (" << (uint32_t) this->state << ")" << "\n";
    }

    bool immediate() {
      return (this->id & 0x8000) != 0;
    }
};



#endif