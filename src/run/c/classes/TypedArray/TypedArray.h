#ifndef TYPED_ARRAY_H
#define TYPED_ARRAY_H

#include <iostream>


template<typename T>
class TypedArray {
  public:
    T * buffer;
    uint32_t length;
    bool autoFree;

    TypedArray(uint32_t length) {
      this->length = length;
      this->buffer = new T[this->length];
      this->autoFree = true;
    }

    TypedArray(uint32_t length, T * buffer) {
      this->length = length;
      this->buffer = buffer;
      this->autoFree = false;
    }

    TypedArray(std::initializer_list<T> buffer) {
      this->length = buffer.size();
      this->buffer = new T[this->length];
      memcpy(this->buffer, buffer.begin(), this->length);
      this->autoFree = true;
    }

    ~TypedArray() {
//      std::cout << "free TypedArray" << "\n";
      if(this->autoFree) {
        delete [] (buffer);
      }
    }

//    T operator [] (const uint32_t index) const {
//      return this->buffer[index];
//    }

    T& operator[] (const uint32_t index) {
      return this->buffer[index];
    }

    inline TypedArray * subarray() {
      return new TypedArray(this->length, this->buffer);
    }

    inline TypedArray * subarray(int32_t start) {
      int32_t length = (int32_t) this->length;
      if (start < 0) {
        start = ((start + length) < 0) ? 0 : (length + start);
      } else if (start > length) {
        start = length;
      }

      return new TypedArray(this->length - start, this->buffer + start);
    }

    inline TypedArray * subarray(int32_t start, int32_t end) {
      int32_t length = (int32_t) this->length;
      if (start < 0) {
        start = ((start + length) < 0) ? 0 : (length + start);
      } else if (start > length) {
        start = length;
      }

      if (end < 0) {
        end = ((end + length) < 0) ? 0 : (length + end);
      } else if (end > length) {
        end = length;
      }

      if (end < start) {
        end = start;
      }

      return new TypedArray(end - start, this->buffer + start);
    }


    void set(TypedArray * array, uint32_t offset = 0) {
      for(uint32_t i = 0; i < array->length; i++) {
        this->buffer[i + offset] = array->buffer[i];
      }
    }

    void print() {
      this->print(0, this->length);
    }

    void print(uint32_t start, uint32_t end) {
      for(uint32_t i = 0; i < end; i++) {
        if(i > 0) std::cout << ", ";
        std::cout << (double) this->buffer[i];
      }
      std::cout << "\n";
    }
};

#define Uint8Array TypedArray<uint8_t>
#define Int8Array TypedArray<int8_t>
#define Uint16Array TypedArray<uint16_t>
#define Int16Array TypedArray<int16_t>
#define Uint32Array TypedArray<uint32_t>
#define Int32Array TypedArray<int32_t>

#endif