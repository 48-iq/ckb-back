

export class NewDocumentDto {
  documentTitle: string;
  contractTitle: string;

  constructor(partial?: Partial<NewDocumentDto>) {
    if (partial)
      Object.assign(this, partial);
  }
}