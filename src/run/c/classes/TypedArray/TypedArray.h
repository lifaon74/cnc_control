#ifndef TYPED_ARRAY_H
#define TYPED_ARRAY_H

#include <iostream>
#include <algorithm>


template<typename T>
class TypedArray {
  public:
    static uint32_t BYTES_PER_ELEMENT() {
      return sizeof(T);
    }


    T * buffer;
    uint32_t length;
    bool autoFree;

    TypedArray(uint32_t length) {
      this->length = length;
      this->_createBuffer();
    }

    TypedArray(T * buffer, uint32_t length) {
      this->length = length;
      this->buffer = buffer;
      this->autoFree = false;
    }

    TypedArray(std::initializer_list<T> array) {
      this->length = array.size();
      this->_createBuffer();
      std::copy(array.begin(), array.end(), this->buffer);
    }

    template<typename U>
    TypedArray(TypedArray<U> * array) {
      this->length = array->length;
      this->_createBuffer();
      this->set(array);
    }


    ~TypedArray() {
//      std::cout << RED_TERMINAL("delete TypedArray\n");
      if(this->autoFree) {
        delete [] (buffer);
      }
    }

    uint32_t byteLength() {
      return this->length * this->BYTES_PER_ELEMENT();
    }

    T& operator[] (const uint32_t index) {
      return this->buffer[index];
    }


    TypedArray * subarray() {
      return new TypedArray(this->buffer, this->length);
    }

    TypedArray * subarray(int32_t start) {
      start = this->_clampIndex(start);

      return new TypedArray(this->buffer + start, this->length - start);
    }

    TypedArray * subarray(int32_t start, int32_t end) {
      start = this->_clampIndex(start);
      end = this->_clampIndex(end);

      if (end < start) {
        end = start;
      }

      return new TypedArray(this->buffer + start, end - start);
    }


    void set(std::initializer_list<T> array, uint32_t offset = 0) {
      uint32_t end = std::min(array.size(), this->length - offset);
      T * _array = array.begin();
      for(uint32_t i = 0; i < end; i++) {
        this->buffer[i + offset] = _array[i];
      }
    }

    template<typename U>
    void set(TypedArray<U> * array, uint32_t offset = 0) {
      uint32_t end = std::min(array->length, this->length - offset);
      for(uint32_t i = 0; i < end; i++) {
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

  protected:
    void _createBuffer() {
       this->buffer = new T[this->length];
       this->autoFree = true;
    }

    int32_t _clampIndex(int32_t index) {
      int32_t length = (int32_t) this->length;
      if (index < 0) {
        return ((index + length) < 0) ? 0 : (length + index);
      } else if (index > length) {
        return length;
      }
    }

};


#define Uint8Array TypedArray<uint8_t>
#define Int8Array TypedArray<int8_t>
#define Uint16Array TypedArray<uint16_t>
#define Int16Array TypedArray<int16_t>
#define Uint32Array TypedArray<uint32_t>
#define Int32Array TypedArray<int32_t>

#endif