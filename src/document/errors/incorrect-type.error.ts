export class IncorrectTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncorrectTypeError';
  }
}