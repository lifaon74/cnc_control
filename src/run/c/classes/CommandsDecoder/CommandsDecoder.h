#ifndef COMMANDS_DECODER_H
#define COMMANDS_DECODER_H

#include "../../../codec/command/c/CommandDecoder.h"
#include "../../../codec/answer/c/AnswerEncoder.h"

class CommandsDecoder {
  public:
    std::queue<Command *> immediateCommands;
    std::queue<Command *> commands;
    std::queue<Answer *> answers;

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

      Uint8Array buffer = Uint8Array(data, sizeof(data));

      this->index = (this->index + 1) % 0xffff;
//        std::cout << "index" << this->index << "\n";

      this->decode(&buffer);
    }

    void addPWM() { // TODO HARDCODED
      uint8_t data[] = {
        0, 0, 8, 1, 0, 0, 0, 0, 0, 0, 224, 63, 174, 71, 225, 122, 20, 174, 243, 63,
      };

      data[0] = (this->index) & 0xff;
      data[1] = (this->index >> 8) & 0xff;

      Uint8Array buffer = Uint8Array(data, sizeof(data));

      this->index = (this->index + 1) % 0xffff;
//        std::cout << "index" << this->index << "\n";

      this->decode(&buffer);
    }


    void decode(Uint8Array * data) {
      this->_checkIfDecoderIsDone();

      for(uint32_t i = 0; i < data->length; i++) {
        this->_decoder.next(data->buffer[i]);
        this->_checkIfDecoderIsDone();
      }
    }

    uint32_t encode(Uint8Array * data) {
      if (!this->_checkIfEncoderIsDone()) {
        return 0;
      }

      uint32_t i = 0;

      for(; i < data->length; i++) {
        data->buffer[i] = this->_encoder.next();

        if (!this->_checkIfEncoderIsDone()) {
          return i;
        }
      }

      return i;
    }


    bool decoding() {
      return !this->_decoder.done();
    }

    bool encoding() {
      return !this->_encoder.done();
    }

  protected:
    CommandDecoder _decoder;
    AnswerEncoder _encoder;
    uint16_t _commandIndex; // the expected command index

    void _checkIfDecoderIsDone() {
      if (this->_decoder.done()) {
        Command * cmd = this->_decoder.output();

        if (cmd != nullptr) {
          if (cmd->immediate()) {
            this->immediateCommands.push(cmd);
          } else {
            if (cmd->id != this->_commandIndex) {
              THROW_ERROR("CommandsDecoder - Expected command id : " + std::to_string(this->_commandIndex) + ", but get instead : " + std::to_string(cmd->id));
            } else if ((this->commands.size() > 0) && (this->commands.front()->id == cmd->id)) {
              THROW_ERROR("CommandsDecoder - Buffer overflow");
            } else {
              this->commands.push(cmd);
              this->_commandIndex = ((cmd->id) + 1) & 0x7fff; // % 0x8000;
            }
          }
        }

        this->_decoder.init();
      }
    }

    bool _checkIfEncoderIsDone() {
      if (this->_encoder.done()) {
        delete (this->_encoder.input()); // nullptr supported by delete

        if (this->answers.size() > 0) {
          Answer * answer = this->answers.front();
          this->answers.pop();
          this->_encoder.init(answer);
        } else {
          return false;
        }
      }

      return true;
    }
};


#endif