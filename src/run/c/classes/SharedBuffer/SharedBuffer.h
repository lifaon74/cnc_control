#ifndef SHARED_BUFFER_H
#define SHARED_BUFFER_H

#include "../TypedArray/TypedArray.h"

// https://stackoverflow.com/questions/8666378/detect-windows-or-linux-in-c-c

#ifdef __unix__
  #define SHARED_BUFFER_POSIX
#elif defined(_WIN32) || defined(_WIN64)
  #define SHARED_BUFFER_WINDOWS
#else
  #define SHARED_BUFFER_UNDEFINED
#endif


#if defined(SHARED_BUFFER_POSIX)

  #include <sys/ipc.h>
  #include <sys/shm.h>

#elif defined(SHARED_BUFFER_WINDOWS)

  #include <windows.h>

#else
  #error "SHARED_BUFFER - Unknown system"
#endif


class SharedBuffer {
  public:
    SharedBuffer(char * key, uint32_t size) {
      this->_key = key;
      this->_size = size;
      this->_buffer = nullptr;
      this->_opened = false;
    }

    Uint8Array * toUint8Array() {
      return new Uint8Array((uint8_t *) (this->_buffer), this->_size);
    }

    bool opened() {
      return this->_opened;
    }

    char * key() {
      return this->_key;
    }

    uint32_t size() {
      return this->_size;
    }

    void * buffer() {
      return this->_buffer;
    }


    void open(bool initialize = false) {
      if (this->_opened) {
        THROW_ERROR("SharedBuffer - already opened");
      } else {

      #if defined(SHARED_BUFFER_POSIX)

        // https://stackoverflow.com/questions/4175379/what-is-the-point-of-having-a-key-t-if-what-will-be-the-key-to-access-shared-mem
        key_t key = ftok(this->_key, 'R');

        int32_t shmId = shmget(key, this->_size, initialize ? IPC_CREAT | 0666 : 0666);

        if (shmId == -1) {
          THROW_ERROR(strerror(errno));
          return;
        }


        this->_buffer = shmat(shmId, NULL, 0);

        if (this->_buffer == (uint8_t *)-1) {
          THROW_ERROR(strerror(errno));
          return;
        }

        if (initialize) { // set all bytes to 0
          memset(this->_buffer, 0, this->_size);
        }


      #elif defined(SHARED_BUFFER_WINDOWS)

        // https://msdn.microsoft.com/en-us/library/aa366551%28v=vs.85%29.aspx

        if (initialize) {
          this->mapFile = CreateFileMapping(
            INVALID_HANDLE_VALUE,    // use paging file
            NULL,                    // default security
            PAGE_READWRITE,          // read/write access
            0,                       // maximum object size (high-order uint32_t)
            this->_size,              // maximum object size (low-order uint32_t)
            this->_key                // name of mapping object
          );
        } else {
          this->mapFile = OpenFileMapping(
            FILE_MAP_ALL_ACCESS,   // read/write access
            false,                 // do not inherit the name
            this->_key              // name of mapping object
          );
        }

        if (this->mapFile == nullptr) {
          THROW_ERROR(std::string("Could not ") + (initialize ? "create" : "open") + " file mapping object " + std::to_string(GetLastError()));
          return;
        }

        this->_buffer = (void *) MapViewOfFile(
          this->mapFile,   // handle to map object
          FILE_MAP_ALL_ACCESS, // read/write permission
          0,
          0,
          this->_size
        );

        if (this->_buffer == nullptr) {
          THROW_ERROR("Could not map view of file " + std::to_string(GetLastError()));
          CloseHandle(this->mapFile);
          return;
        }

      #endif

        this->_opened = true;
      }
    }

    void close() {
      if (this->_opened) {
        #if defined(SHARED_BUFFER_POSIX)

            // TODO

        #elif defined(SHARED_BUFFER_WINDOWS)

          UnmapViewOfFile(this->_buffer);
          CloseHandle(this->mapFile);

        #endif

        this->_opened = false;
      } else {
        THROW_ERROR("SharedBuffer - already closed");
      }
    }

  protected:
    bool _opened;
    char * _key;
    uint32_t _size;
    void * _buffer;

    #if defined(SHARED_BUFFER_POSIX)
    #elif defined(SHARED_BUFFER_WINDOWS)

      HANDLE mapFile; // HANDLE = void *

    #else
      #error "SHARED_BUFFER - Unknown system"
    #endif
};



#endif