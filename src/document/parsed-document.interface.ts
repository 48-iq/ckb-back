
export interface ParsedDocument {
  contract: {
    name: string;
  };
  name: string;
  pages: {
    name: string;
    text: string;
    paragraphs: {
      text: string;
      name: string;
      facts: {
        text: string;
        name: string;
        entities: {
          name: string;
        }[];
      }[];
    }[];
  }[];
}