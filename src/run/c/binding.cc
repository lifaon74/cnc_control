#define NOMINMAX

#include <nan.h>
//#include <node.h>

#include <cmath>
#include <ctime>
#include <queue>
#include <iostream>
#include <algorithm>


//#define RASPBERRY

#include "./snippets/snippets.h"
#include "./classes/TypedArray/TypedArray.h"
#include "./classes/SharedBuffer/SharedBuffer.h"
#include "./classes/SharedBuffer/NodeSharedBuffer.h"
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

//void start(const v8::FunctionCallbackInfo<v8::Value>& args) {
//  v8::Isolate* isolate = args.GetIsolate();
//
//  try {
//    test();
//  } catch (const std::exception& e){
//    std::cerr << e.what() << '\n';
//    Nan::ThrowError(e.what());
//  }
//}

//void Initialize(v8::Local<v8::Object> exports) {
//  NodeSharedBuffer::Init(exports);
//  NODE_SET_METHOD(exports, "start", start);
//}


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
  NodeSharedBuffer::Init(target);
}

// register module
NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)