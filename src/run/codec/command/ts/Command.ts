export enum CommandCodes {
  STOP = 0x00,
  PAUSE = 0x01,
  RESUME = 0x02,
  SET_PRECISION = 0x03,
  GET_CAPABILITIES = 0x04,
  READ_INPUTS = 0x05,
  DEFINE_ENDSTOPS = 0x06,
  HOME = 0x07,
  PWM = 0x08,
  ENABLE_STEPPERS = 0x09,
  MOVE = 0x0a,


  ERROR = 0xff,
}

export class Command {
  public id: number;
  public code: number;
  public command: any;

  constructor(id: number = 0, code: number = 0, command: any = null) {
    this.id = id;
    this.code = code;
    this.command = command;
  }

}
