#ifndef ITERATOR_H
#define ITERATOR_H

class Iterator {
  public:
    Iterator() {
      this->_done = false;
    }

    bool done() {
      return this->_done;
    }

  protected:
    bool _done;

    void throwIfDone() {
      if(this->done()) {
        THROW_ERROR("Call next on done Iterator");
      };
    }
};

#endif