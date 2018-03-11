export class Any {

  // 0b00xxxxxx => primitives
  static PRIMITIVES = {
    UNDEFINED : 0b00000000, // 0b00000000
    NULL      : 0b00000001, // 0b00000001
    BOOLEAN   : 0b00000010, // 0b0000001x
    NUMBER    : 0b00010000, // 0b0001xxxx
    STRING    : 0b00100000, // 0b00100000
  };

  // 0b01xxxxxx => objects
  static OBJECTS = {
    BOOLEAN : 0b01000010,
    NUMBER  : 0b01010000,
    STRING  : 0b01100000,
    DATE    : 0b01100001,
    REGEXP  : 0b01100010,

    SHARED_ARRAY_BUFFER : 0b01100100,
    ARRAY_BUFFER        : 0b01100101,
    ARRAY_BUFFER_VIEW   : 0b01100110,

    MAP     : 0b01101000,
  };

  static SUPER_TYPES = {
    PRIMITIVE: 0b00000000,
    OBJECT:    0b01000000,
  };

  static MASKS = {
    SUPER_TYPES: 0b00111111,

    BOOLEAN: 0b00000001,
    NUMBER: 0b00001111,
  };





  // static DATE                 = 0b01100010, // 0b01100010
  // static REGEXP               = 0b01100011, // 0b01100011

  // static SHARED_ARRAY_BUFFER  = 0b01100100, // 0b01100100
  // static ARRAY_BUFFER         = 0b01100101, // 0b01100101
  // static ARRAY_BUFFER_VIEW    = 0b01100110, // 0b01100110
  // static MAP                  = 0b01101000, // 0b01101000
  // static SET                  = 0b01101001, // 0b01101001
  // static ARRAY                = 0b01101010, // 0b01101010
  // static OBJECT               = 0b01101011, // 0b01101011

  static POINTER              = 0b10000000;
}
