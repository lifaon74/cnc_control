#ifndef COMMANDS_DECODER_H
#define COMMANDS_DECODER_H

class CommandsExecutor {
  public:
    std::queue<Command *> immediateCommands;
    std::queue<Command *> commands;

    CommandsDecoder() {
      this->_commandIndex = 0;
    }

    // decode commands from a data source (shared buffer)
     void update() {}


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