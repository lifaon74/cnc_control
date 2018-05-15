#ifndef COMMANDS_DECODER_H
#define COMMANDS_DECODER_H

#include "../../../codec/command/c/CommandDecoder.h"

class CommandsDecoder {
  public:
    std::queue<Command *> immediateCommands;
    std::queue<Command *> commands;

    CommandsDecoder() {
      this->_commandIndex = 0;
    }

    // decode commands from a data source (shared buffer)
    uint16_t index = 0;

    void update() { // TODO HARDCODED
      if (this->commands.size() == 0) {
        this->addMove();
        this->addPWM();
      }
    }

    void addMove() { // TODO HARDCODED
      uint8_t data[] = {
        0, 0, 10, 12, 0, 0, 0, 0, 0, 0, 36, 64, 0, 0, 0, 0, 0, 0, 224, 63, 154, 153, 153, 153, 153, 153, 185, 63, 17, 0, 0, 0, 228, 255, 255, 255
      };

      data[0] = (this->index) & 0xff;
      data[1] = (this->index >> 8) & 0xff;

      Uint8Array buffer = Uint8Array(sizeof(data), data);

      this->index = (this->index + 1) % 0xffff;
//        std::cout << "index" << this->index << "\n";

      this->next(&buffer);
    }

    void addPWM() { // TODO HARDCODED
      uint8_t data[] = {
        0, 0, 8, 1, 0, 0, 0, 0, 0, 0, 224, 63, 174, 71, 225, 122, 20, 174, 243, 63,
      };

      data[0] = (this->index) & 0xff;
      data[1] = (this->index >> 8) & 0xff;

      Uint8Array buffer = Uint8Array(sizeof(data), data);

      this->index = (this->index + 1) % 0xffff;
//        std::cout << "index" << this->index << "\n";

      this->next(&buffer);
    }


    void next(Uint8Array * data) {
      this->_checkIfDecoderIsDone();

      for(uint32_t i = 0; i < data->length; i++) {
        this->_decoder.next(data->buffer[i]);
        this->_checkIfDecoderIsDone();
      }
    }

    bool decoding() {
      return !this->_decoder.done();
    }

  protected:
    CommandDecoder _decoder;
    uint16_t _commandIndex; // the expected command index

    void _checkIfDecoderIsDone() {
      if (this->_decoder.done()) {
        Command * cmd = this->_decoder.output();
        if (cmd->id == 0xffff) {
          this->immediateCommands.push(cmd);
        } else {
          if (cmd->id != this->_commandIndex) {
            THROW_ERROR("CommandsDecoder - Expected command id : " + std::to_string(this->_commandIndex) + ", but get instead : " + std::to_string(cmd->id));
          } else if ((this->commands.size() > 0) && (this->commands.front()->id == cmd->id)) {
            THROW_ERROR("CommandsDecoder - Buffer overflow");
          } else {
            this->commands.push(cmd);
            this->_commandIndex = ((cmd->id) + 1) % 0xffff;
          }
        }
        this->_decoder.reset();
      }
    }
};


#endif