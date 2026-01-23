
export interface ProcessedPage {
  text: string;
  name: string;
  paragraphs: {
    text: string;
    name: string;
    facts: {
      name: string;
      text: string;
      entities: {
        name: string;
      }[];
    }[];
  }[];
}