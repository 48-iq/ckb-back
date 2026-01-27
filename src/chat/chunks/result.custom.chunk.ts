
export class ResultCustomChunk {
  type: string;
  text: string;
  textUpdate: string;

  constructor(args: {
    type: string,
    text: string,
    textUpdate: string
  }) {
    this.type = args.type;
    this.text = args.text;
    this.textUpdate = args.textUpdate;
  }
}