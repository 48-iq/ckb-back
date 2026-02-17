import { ProcessedPage } from "./processed-page.entity";

export interface ProcessedDocument {
  contract: {
    name: string;
  };
  name: string;
  postgresId: string;
  pages: ProcessedPage[];
}