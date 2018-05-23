#include <nan.h>

#include <cmath>
#include <ctime>
#include <queue>
#include <iostream>


//#define RASPBERRY

#include "./snippets/snippets.h"
#include "./classes/TypedArray/TypedArray.h"
//#include "classes/SharedBufferStream.h"
#include "../../classes/lib/codec/c/codec.h"
//#include "../codec/command/c/CommandDecoder.h"
#include "./classes/CommandsExecutor/CommandsExecutor.h"
//#include "../codec/command/pwm-command/c/PWMCommandDecoder.h"
//#include "classes/GPIOController.h"

#include "./tests/tests.h"

/**
print the type: std::cout << typeid(variable).name() << '\n';
**/



NAN_METHOD(start) {
  try {
    test();
  } catch (const std::exception& e){
    std::cerr << e.what() << '\n';
    Nan::ThrowError(e.what());
  }
}

NAN_MODULE_INIT(Initialize) {
  NAN_EXPORT(target, start);
}

// register module
NODE_MODULE(sharedbuffer, Initialize)