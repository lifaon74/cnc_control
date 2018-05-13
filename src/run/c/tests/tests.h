#ifndef TESTS_H
#define TESTS_H


template<typename T>
T * decode(ByteDecoder<T> * decoder, uint8_t buffer[], size_t bufferLength) {
  uint32_t i = 0;
  while(!decoder->done()) {
    if(i >= bufferLength) {
      throw std::logic_error("Buffer overflow");
    }
    decoder->next(buffer[i]);
    i++;
  }
  return decoder->output();
}


void textPWM() {
  // cmd -> id: 123, code: 8 (pwm)
  // pwm -> pin: 1, value: 0.5, period: 1.23
  uint8_t data[] = {123, 0, 8, 1, 0, 0, 0, 0, 0, 0, 224, 63, 174, 71, 225, 122, 20, 174, 243, 63};

  CommandDecoder a;
  Command * cmd = decode(&a, data, sizeof(data));
  cmd->print();
  PWM * pwm = (PWM *) cmd->command;
  pwm->print();
}

void textStepperMovement() {
  // cmd -> id: 123, code: 8 (StepperMovement)
  // StepperMovement -> duration: 10, initialSpeed: 0.5, acceleration: 0.1
  // moves :
  //  - pin: 1, target: 17
  //  - pin: 3, target: -28
  uint8_t data[] = {123, 0, 9, 12, 0, 0, 0, 0, 0, 0, 36, 64, 0, 0, 0, 0, 0, 0, 224, 63, 154, 153, 153, 153, 153, 153, 185, 63, 17, 0, 0, 0, 228, 255, 255, 255};

  CommandDecoder a;
  Command * cmd = decode(&a, data, sizeof(data));
  cmd->print();
//  PWM * pwm = (PWM *) cmd->command;
//  pwm->print();
}

void textCommand() {
  textPWM();
  textStepperMovement();
}


#endif