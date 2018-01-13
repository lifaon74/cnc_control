#ifndef SHARED_BUFFER_STREAM_H
#define SHARED_BUFFER_STREAM_H

#include <iostream>

#include <sys/ipc.h>
#include <sys/shm.h>

#include "TypedArray.h"

Uint8Array * createSharedBuffer(uint32_t key, uint32_t size, bool initialize = false) {
  int32_t shmId = shmget(key, size, initialize ? IPC_CREAT | 0666 : 0666);

  if (shmId < 0) {
    Nan::ThrowError(strerror(errno));
    return nullptr;
  }


  uint8_t * data = (uint8_t *) shmat(shmId, NULL, 0);

  if (data == (uint8_t *)-1) {
    Nan::ThrowError(strerror(errno));
    return nullptr;
  }

  if (initialize) {
    memset(data, 0, size);
  }

  return new Uint8Array(size, data);
}


/***
    SharedBufferStream
****/
class SharedBufferStream {
  public:
    static uint32_t ID;

    static const uint8_t PACKET_ID_REG = 0;
    static const uint8_t PACKET_SIZE_REG = 1;
    static const uint8_t START_OFFSET = 5;

    static SharedBufferStream * createMaster(uint32_t size = 1e6, uint32_t id = SharedBufferStream::ID++) {
      SharedBufferStream * sharedBuffer = new SharedBufferStream(createSharedBuffer(id, size, true));
      sharedBuffer->packetId = 255;
      return sharedBuffer;
    }

    static SharedBufferStream * create(uint32_t size = 1e6, uint32_t id = SharedBufferStream::ID++) {
      return new SharedBufferStream(createSharedBuffer(id, size));
    }

    Uint8Array * buffer;
    uint8_t packetId;

    SharedBufferStream(Uint8Array * buffer) {
      this->buffer = buffer;
      this->packetId = 0;
      std::cout << "SharedBufferStream:" << (uint32_t) this->buffer->buffer[0] << "\n";
    }

    ~SharedBufferStream() {
      std::cout << "destroy SharedBufferStream:" << "\n";
      delete this->buffer;
    }

    bool readable() {
      return (this->buffer->buffer[SharedBufferStream::PACKET_ID_REG]) != this->packetId;
    }

    uint32_t size() {
      return (
        (uint32_t) (this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG    ])
        | (uint32_t) ((this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 1] << 8))
        | (uint32_t) ((this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 2] << 16))
        | (uint32_t) ((this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 3] << 24))
      );
    }

    void size(uint32_t value) {
      this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG    ] = value;
      this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 1] = value >> 8;
      this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 2] = value >> 16;
      this->buffer->buffer[SharedBufferStream::PACKET_SIZE_REG + 3] = value >> 24;
    }

    uint32_t maxSize() {
      return this->buffer->length - SharedBufferStream::START_OFFSET;
    }

    Uint8Array * data() {
      return this->buffer->subarray(SharedBufferStream::START_OFFSET, SharedBufferStream::START_OFFSET + this->size());
    }

    void data(Uint8Array * value) {
      this->size(value->length);
      this->buffer->set(value, SharedBufferStream::START_OFFSET);
    }

    void receive() {
      this->packetId = this->buffer->buffer[SharedBufferStream::PACKET_ID_REG];
    }

    void send() {
      this->packetId++;
      this->buffer->buffer[SharedBufferStream::PACKET_ID_REG] = this->packetId;
    }
};

uint32_t SharedBufferStream::ID = 10;


#endif