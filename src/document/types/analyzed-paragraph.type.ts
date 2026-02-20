
export type AnalyzedParagraph = {
  name: string;
  text: string;
  facts: {
    name: string;
    text: string;
    entities: string[];
  }[];
};