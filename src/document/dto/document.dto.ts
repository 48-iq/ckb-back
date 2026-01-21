
export class DocumentDto {
  id: string;
  link: string;
  title: string;
  contract: {
    id: string;
    title: string;
  }

  constructor(partial?: Partial<DocumentDto>) {
    if (partial)
      Object.assign(this, partial);
  }
}