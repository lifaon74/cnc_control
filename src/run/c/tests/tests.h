#ifndef TESTS_H
#define TESTS_H

#define TEST_MACRO($a, $b) $a $b

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




void testPWM() {
  // cmd -> id: 123, code: 8 (pwm)
  // pwm -> pin: 1, value: 0.5, period: 1.23
  uint8_t data[] = {123, 0, 8, 1, 0, 0, 0, 0, 0, 0, 224, 63, 174, 71, 225, 122, 20, 174, 243, 63};

  CommandDecoder a;
  Command * cmd = decode(&a, data, sizeof(data));
  cmd->print();
//  PWM * pwm = (PWM *) cmd->command;
//  pwm->print();
  CAST_COMMAND(, cmd, ->print());

  delete cmd;
}

void testStepperMovement() {
  // cmd -> id: 123, code: 8 (StepperMovement)
  // StepperMovement -> duration: 10, initialSpeed: 0.5, acceleration: 0.1
  // moves :
  //  - pin: 1, target: 17
  //  - pin: 3, target: -28
  uint8_t data[] = {123, 0, 10, 12, 0, 0, 0, 0, 0, 0, 36, 64, 0, 0, 0, 0, 0, 0, 224, 63, 154, 153, 153, 153, 153, 153, 185, 63, 17, 0, 0, 0, 228, 255, 255, 255};

  CommandDecoder a;
  Command * cmd = decode(&a, data, sizeof(data));
  cmd->print();
  CAST_COMMAND(, cmd, ->print());
//  StepperMovement * movement = (StepperMovement *) cmd->command;
//  movement->print();

  delete cmd;
}


void testCommand() {
  testPWM();
  testStepperMovement();
}

void testCommands() {
  uint8_t data[] = {
    0, 0, 8, 1, 0, 0, 0, 0, 0, 0, 224, 63, 174, 71, 225, 122, 20, 174, 243, 63,
    1, 0, 10, 12, 0, 0, 0, 0, 0, 0, 36, 64, 0, 0, 0, 0, 0, 0, 224, 63, 154, 153, 153, 153, 153, 153, 185, 63, 17, 0, 0, 0, 228, 255, 255, 255
  };

  Uint8Array buffer = Uint8Array(sizeof(data), data);

  CommandsDecoder decoder;
  decoder.next(&buffer);

  while (decoder.commands.size() > 0) {
    decoder.commands.front()->print();
    CAST_COMMAND(, decoder.commands.front(), ->print());
    decoder.commands.pop();
  }
}

void test() {
  testCommands();
}


#endif