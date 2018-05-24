#ifndef INPUT_STATE_ANSWER_H
#define INPUT_STATE_ANSWER_H

class InputsStateAnswer {
  public:
    uint16_t pinsState;
    Uint16Array * adcValues;

    InputsStateAnswer(uint16_t id = 0, Uint16Array * adcValues) {
      this->pinsState = id;
      this->adcValues = adcValues;
    }

    ~InputsStateAnswer() {
      std::cout << RED_TERMINAL("delete InputsStateAnswer\n");
    }

    void print() {
      std::cout << "InputsStateAnswer: pinsState (" << (uint32_t) this->id << "), adc values : ";
      this->adcValues->print();
    }
};


#endif