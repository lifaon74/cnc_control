

export class Command {
  public id: number;
  public code: number;
  public command: any;

  constructor(id: number = 0, code: number = 0, command: any = null) {
    this.id = id;
    this.code = code;
    this.command = command;
  }

  immediate(): boolean {
    return (this.id & 0x8000) !== 0; // or 0b1000000000000000
  }
}
