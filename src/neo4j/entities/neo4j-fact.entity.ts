import { Neo4jEntity } from "./neo4j-entity.entity";


export interface Neo4jFact {
  name: string;
  text: string;
  textEmbedding: number[];
  entities: Neo4jEntity[];
}