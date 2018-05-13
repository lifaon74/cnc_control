#ifndef SNIPPETS_H
#define SNIPPETS_H

//#define math_max(x, y) ((x > y) ? x : y)
//#define math_min(x, y) ((x < y) ? x : y)
//#define math_abs(x) ((x < 0) ? -x : x)
#define math_sign(x) ((x < 0) ? (-1) : ((x > 0) ? 1 : 0))
//#define math_floor(x) ((x < 0) ? (-1) : ((x > 0) ? 1 : 0))

// http://www.ti.com/lit/ds/symlink/drv8825.pdf
// step freqency  max : 250Khz (2us HIGH, 2us LOW)

double GetTime() {
  return ((double) std::clock()) / CLOCKS_PER_SEC;
}

//#_define THROW_ERROR(error) std::cout << "[ERROR] : " << error << '\n';
#define THROW_ERROR(error) throw std::logic_error(error);
//#_define THROW_ERROR(error) Nan::ThrowError(error);
//Nan::ThrowError

#endif