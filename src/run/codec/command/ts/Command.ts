export enum CommandCodes {
  PWM = 0x08,
  MOVE = 0x09,
}

export class Command {
  public id: number;
  public code: number;
  public command: any;

  constructor(id: number = null, code: number = 0, command: any = null) {
    this.id = id;
    this.code = code;
    this.command = command;
  }

}
