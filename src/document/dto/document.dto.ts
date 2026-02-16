import { DocumentStatus } from "src/postgres/entities/document.entity";

export class DocumentDto {
  id: string;
  title: string;
  contract: {
    id: string;
    title: string;
  }
  status: DocumentStatus;
  createdAt: string;

  constructor(partial?: Partial<DocumentDto>) {
    if (partial)
      Object.assign(this, partial);
  }
}