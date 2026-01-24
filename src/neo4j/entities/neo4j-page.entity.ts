import { Neo4jParagraph } from "./neo4j-paragraph.entity";


export interface Neo4jPage {
  name: string;
  text: string;
  textEmbedding: number[];
  paragraphs: Neo4jParagraph[];
}