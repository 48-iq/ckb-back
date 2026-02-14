
export class DocumentDto {
  id: string;
  title: string;
  contract: {
    id: string;
    title: string;
  }
  createdAt: string;

  constructor(partial?: Partial<DocumentDto>) {
    if (partial)
      Object.assign(this, partial);
  }
}