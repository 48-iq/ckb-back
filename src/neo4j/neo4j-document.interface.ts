export interface Neo4jDocument {
  contract: {
    name: string;
    nameEmbedding: number[];
  };
  name: string;
  nameEmbedding: number[];
  postgresId: string;
  pages: {
    name: string;
    text: string;
    textEmbedding: number[];
    paragraphs: {
      text: string;
      textEmbedding: number[];
      name: string;
      facts: {
        text: string;
        textEmbedding: number[];
        name: string;
        entities: {
          name: string;
          nameEmbedding: number[];
        }[];
      }[];
    }[];
  }[];
}