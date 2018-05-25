#ifndef TESTS_H
#define TESTS_H

#define TEST_MACRO($a, $b) $a $b

template<typename T>
//T * decode(ByteDecoder<T> * decoder, uint8_t buffer[], size_t bufferLength) {
T * decode(ByteDecoder<T> * decoder, Uint8Array * buffer) {
  uint32_t i = 0;
  while(!decoder->done()) {
    if(i >= buffer->length) {
      throw std::logic_error("Buffer overflow");
    }
    decoder->next((*buffer)[i]);
    i++;
  }
  return decoder->output();
}


template<typename T>
Uint8Array * encode(ByteEncoder<T> * encoder, Uint8Array * buffer) {
  uint32_t i = 0;
  while(!encoder->done()) {
    (*buffer)[i] = encoder->next();
    i++;
  }
  return buffer->subarray(0, i);
}



// test if PWM commands are properly decoded
void testPWMCommand() {
  // cmd -> id: 123, code: 8 (pwm)
  // pwm -> pin: 1, value: 0.5, period: 1.23
  Uint8Array buffer = Uint8Array({123, 0, 8, 1, 0, 0, 0, 0, 0, 0, 224, 63, 174, 71, 225, 122, 20, 174, 243, 63});

  CommandDecoder a;
  Command * cmd = decode(&a, &buffer);
  cmd->print();
//  PWMCommand * pwm = (PWMCommand *) cmd->command;
//  pwm->print();
  CAST_COMMAND(, cmd, ->print());

  delete cmd;
}

// test if StepperMovement commands are properly decoded
void testStepperMovementCommand() {
  // cmd -> id: 123, code: 8 (StepperMovement)
  // StepperMovement -> duration: 10, initialSpeed: 0.5, acceleration: 0.1
  // moves :
  //  - pin: 1, target: 17
  //  - pin: 3, target: -28
  Uint8Array buffer = Uint8Array({123, 0, 10, 12, 0, 0, 0, 0, 0, 0, 36, 64, 0, 0, 0, 0, 0, 0, 224, 63, 154, 153, 153, 153, 153, 153, 185, 63, 17, 0, 0, 0, 228, 255, 255, 255});

  CommandDecoder a;
  Command * cmd = decode(&a, &buffer);
  cmd->print();
  CAST_COMMAND(, cmd, ->print());
//  StepperMovement * movement = (StepperMovementCommand *) cmd->command;
//  movement->print();

  delete cmd;
}


// test many commands
void testCommand() {
  testPWMCommand();
  testStepperMovementCommand();
}


void testInputsStateAnswer() {
  Uint8Array * buffer = new Uint8Array(1000000);
  InputsStateAnswer * inputsState = new InputsStateAnswer(0b01100011 /* 99 */, new Uint16Array({0, 1, 2, 3, 4, 5, 6, 7}));
  Answer * ans = new Answer(123, CMD_READ_INPUTS, 0, inputsState);

  AnswerEncoder a = AnswerEncoder(ans);
  Uint8Array * _buffer = encode(&a, buffer);
  _buffer->print();

  delete buffer;
  delete ans;
}


void testAnswer() {
  testInputsStateAnswer();
}


void testCommands() {
  Uint8Array buffer = Uint8Array({
    0, 0, 8, 1, 0, 0, 0, 0, 0, 0, 224, 63, 174, 71, 225, 122, 20, 174, 243, 63,
    1, 0, 10, 12, 0, 0, 0, 0, 0, 0, 36, 64, 0, 0, 0, 0, 0, 0, 224, 63, 154, 153, 153, 153, 153, 153, 185, 63, 17, 0, 0, 0, 228, 255, 255, 255
  });

  CommandsDecoder decoder;
  decoder.next(&buffer);

  while (decoder.commands.size() > 0) {
    decoder.commands.front()->print();
    CAST_COMMAND(, decoder.commands.front(), ->print());
    decoder.commands.pop();
  }
}

void testCommandsExecutor() {
  CommandsExecutor executor;
  executor.start();
}



void testTypedArray() {
  Uint8Array * uint8_buffer = new Uint8Array({0, 1, 2, 3, 4, 5, 6, 7});
  uint8_buffer->print();
  std::cout << Uint8Array::BYTES_PER_ELEMENT() << '\n';

  Uint32Array * uint32_buffer = new Uint32Array({7, 6, 5, 4, 3, 2, 1, 0});
  uint32_buffer->print();
  std::cout << Uint32Array::BYTES_PER_ELEMENT() << '\n';

  Uint16Array * uint16_buffer = new Uint16Array(uint8_buffer);
  uint16_buffer->print();

  uint16_buffer->set(uint32_buffer, 4);
  uint16_buffer->print();

  delete uint8_buffer;
  delete uint32_buffer;
  delete uint16_buffer;
}


void test() {
//  testTypedArray();
//  testCommand();
//  testCommands();
  testAnswer();
//  testCommandsExecutor();
}


#endif