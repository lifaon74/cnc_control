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


void testCommand() {
  testPWMCommand();
  testStepperMovementCommand();
}


void testAnswer() {
  Uint8Array * buffer = new Uint8Array(1000000);

  Answer * ans = new Answer(123, 8, 0);
  AnswerEncoder a = AnswerEncoder(ans);
  Uint8Array * _buffer = encode(&a, buffer);
  _buffer->print();

  delete buffer;
  delete ans;
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



void test() {
//  testCommand();
//  testCommands();
  testAnswer();
//  testCommandsExecutor();
}


#endif