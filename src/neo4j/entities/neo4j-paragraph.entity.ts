import { Neo4jFact } from "./neo4j-fact.entity";


export interface Neo4jParagraph {
  name: string;
  text: string;
  textEmbedding: number[];
  facts: Neo4jFact[];
}