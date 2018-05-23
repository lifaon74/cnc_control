
export class Answer {
  public id: number;
  public code: number;
  public state: number;
  public answer: any;

  constructor(
    id: number = 0,
    code: number = 0,
    state: number = 0,
    answer: any = null
  ) {
    this.id = id;
    this.code = code;
    this.state = state;
    this.answer = answer;
  }
}
