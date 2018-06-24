#ifndef NODE_SHARED_BUFFER_H
#define NODE_SHARED_BUFFER_H

#include <nan.h>

// https://medium.com/netscape/tutorial-building-native-c-modules-for-node-js-using-nan-part-1-755b07389c7c

char * V8StringToCString(v8::Local<v8::String> str) {
  v8::String::Utf8Value value(str);
  return *value ? *value : "<string conversion failed>";
}

char * StringCopy(char * string) {
  uint32_t size = 0;
  while (string[size++] != '\0');
  char * copy = new char[size];
  for (uint32_t i = 0; i < size; i++) {
    copy[i] = string[i];
  }
  return copy;
}

// TODO => find how to create persistent variable with v8 to cache the buffer
template<typename T>
class PersistentV8Variable {
  public:
    v8::Local<T> * local;
    v8::Persistent<T> persistent;

    PersistentV8Variable(v8::Local<T> * local, v8::Isolate * isolate) {
      this->local = local;
      this->persistent.Reset(isolate, &(this->local));
    }
};


class NodeSharedBuffer : public Nan::ObjectWrap {
  public:
    static NAN_MODULE_INIT(Init);
    static NAN_METHOD(New);

    static NAN_METHOD(open);
    static NAN_METHOD(close);

    static NAN_GETTER(HandleGetters);
    static NAN_SETTER(HandleSetters);

    static Nan::Persistent<v8::FunctionTemplate> constructor;


    NodeSharedBuffer(char * key, uint32_t size) {
      this->_key = key;
      this->sharedBuffer = new SharedBuffer(key, size);
      this->buffer = nullptr;
    }

    ~NodeSharedBuffer() {
      std::cout << "delete NodeSharedBuffer" << '\n';
      delete[] this->_key;
      delete this->sharedBuffer;
      delete this->buffer;
    }
  protected:
    char * _key;
    SharedBuffer * sharedBuffer;
    v8::Local<v8::ArrayBuffer> * buffer;

};

Nan::Persistent<v8::FunctionTemplate> NodeSharedBuffer::constructor;

void CleanupV8Point(v8::Persistent<v8::Object> object, void*) {
std::cout << "delete NodeSharedBuffer" << '\n';
    // do whatever cleanup on object that you're looking for
//    object.destroyCppObjects();
}

NAN_MODULE_INIT(NodeSharedBuffer::Init) {
  v8::Local<v8::FunctionTemplate> ctor = Nan::New<v8::FunctionTemplate>(NodeSharedBuffer::New);
  constructor.Reset(ctor);
  ctor->InstanceTemplate()->SetInternalFieldCount(1);
  ctor->SetClassName(Nan::New("NodeSharedBuffer").ToLocalChecked());

  // link our getters and setter to the object property
  Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("opened").ToLocalChecked(), NodeSharedBuffer::HandleGetters, NodeSharedBuffer::HandleSetters);
  Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("key").ToLocalChecked(), NodeSharedBuffer::HandleGetters, NodeSharedBuffer::HandleSetters);
  Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("size").ToLocalChecked(), NodeSharedBuffer::HandleGetters, NodeSharedBuffer::HandleSetters);
  Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("buffer").ToLocalChecked(), NodeSharedBuffer::HandleGetters, NodeSharedBuffer::HandleSetters);

  Nan::SetPrototypeMethod(ctor, "open", NodeSharedBuffer::open);
  Nan::SetPrototypeMethod(ctor, "close", NodeSharedBuffer::close);

  target->Set(Nan::New("NodeSharedBuffer").ToLocalChecked(), ctor->GetFunction());
}

NAN_METHOD(NodeSharedBuffer::New) {
  // throw an error if constructor is called without new keyword
  if(!info.IsConstructCall()) {
    return Nan::ThrowError(Nan::New("NodeSharedBuffer called without new keyword").ToLocalChecked());
  }

  if(info.Length() != 2) {
    return Nan::ThrowError(Nan::New("Expected 2 arguments for new NodeSharedBuffer()").ToLocalChecked());
  }

  if (!info[0]->IsString()) {
   return Nan::ThrowError(Nan::New("Expected string as first argument (key)").ToLocalChecked());
  }

  if (!info[1]->IsNumber()) {
   return Nan::ThrowError(Nan::New("Expected number as second argument (size)").ToLocalChecked());
  }

  // create a new instance and wrap our javascript instance
  NodeSharedBuffer* nsb = new NodeSharedBuffer(StringCopy(V8StringToCString(info[0]->ToString())), (uint32_t) info[1]->NumberValue());
  nsb->Wrap(info.Holder());

  // return the wrapped javascript instance
  info.GetReturnValue().Set(info.Holder());
}



NAN_GETTER(NodeSharedBuffer::HandleGetters) {
  NodeSharedBuffer* self = Nan::ObjectWrap::Unwrap<NodeSharedBuffer>(info.This());

  std::string propertyName = std::string(*Nan::Utf8String(property));
  if (propertyName == "opened") {
    info.GetReturnValue().Set(self->sharedBuffer->opened());
  } else if (propertyName == "key") {
    info.GetReturnValue().Set(Nan::New(self->sharedBuffer->key()).ToLocalChecked());
  } else if (propertyName == "size") {
    info.GetReturnValue().Set(Nan::New(self->sharedBuffer->size()));
  } else if (propertyName == "buffer") {
    if (self->buffer == nullptr) {
      info.GetReturnValue().Set(Nan::Null());
    } else {
      info.GetReturnValue().Set(*(self->buffer));
//      v8::Isolate * isolate = v8::Isolate::GetCurrent();
//      info.GetReturnValue().Set(Nan::New<v8::ArrayBuffer>(v8::ArrayBuffer::New(isolate, self->sharedBuffer->buffer(), self->sharedBuffer->size())));

//      v8::Local<v8::ArrayBuffer> ab = v8::ArrayBuffer::New(isolate, self->sharedBuffer->buffer(), self->sharedBuffer->size());
//      v8::Persistent<v8::ArrayBuffer> pab(isolate, ab);
//      info.GetReturnValue().Set(ab);

    }
  } else {
    info.GetReturnValue().Set(Nan::Undefined());
  }
}

NAN_SETTER(NodeSharedBuffer::HandleSetters) {
  NodeSharedBuffer* self = Nan::ObjectWrap::Unwrap<NodeSharedBuffer>(info.This());

  std::string propertyName = std::string(*Nan::Utf8String(property));
  if (propertyName == "opened") {
    return Nan::ThrowError(Nan::New("Cannot assign value to a readonly property").ToLocalChecked());
  } else if (propertyName == "key") {
  return Nan::ThrowError(Nan::New("Cannot assign value to a readonly property").ToLocalChecked());
  } else if (propertyName == "size") {
    return Nan::ThrowError(Nan::New("Cannot assign value to a readonly property").ToLocalChecked());
  } else if (propertyName == "buffer") {
    return Nan::ThrowError(Nan::New("Cannot assign value to a readonly property").ToLocalChecked());
  }
}


NAN_METHOD(NodeSharedBuffer::open) {
  NodeSharedBuffer * self = Nan::ObjectWrap::Unwrap<NodeSharedBuffer>(info.This());

  bool initialize;
  if ((info.Length() < 0) || info[0]->IsUndefined()) {
    initialize = false;
  } else if (info[0]->IsBoolean()) {
      initialize = info[0]->BooleanValue();
  } else {
    return Nan::ThrowError(Nan::New("Expected boolean as first argument (initialize)").ToLocalChecked());
  }

  try {
    self->sharedBuffer->open(initialize);


    v8::Isolate * isolate = v8::Isolate::GetCurrent();
//    self->buffer = &(Nan::New<v8::ArrayBuffer>(v8::ArrayBuffer::New(isolate, self->sharedBuffer->buffer(), self->sharedBuffer->size())));
    v8::Local<v8::ArrayBuffer> ab = v8::ArrayBuffer::New(isolate, self->sharedBuffer->buffer(), self->sharedBuffer->size());
    PersistentV8Variable<v8::ArrayBuffer> * test = new PersistentV8Variable<v8::ArrayBuffer>(&ab, isolate);

//    v8::Persistent<v8::ArrayBuffer> pab(isolate, ab);
//    pab.MarkIndependent();
    self->buffer = &(ab);
  } catch (const std::exception& e){
    std::cerr << e.what() << '\n';
    Nan::ThrowError(e.what());
  }

  info.GetReturnValue().Set(Nan::Undefined());
}

NAN_METHOD(NodeSharedBuffer::close) {
  NodeSharedBuffer * self = Nan::ObjectWrap::Unwrap<NodeSharedBuffer>(info.This());

  try {
    self->sharedBuffer->close();
    self->buffer = nullptr;
  } catch (const std::exception& e){
    std::cerr << e.what() << '\n';
    Nan::ThrowError(e.what());
  }

  info.GetReturnValue().Set(Nan::Undefined());
}

#endif