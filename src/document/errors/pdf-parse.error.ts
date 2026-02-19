export class PDFParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PDFParseError';
  }
}