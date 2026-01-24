import { Neo4jPage } from "./neo4j-page.entity";

export interface Neo4jDocument {
  contract: {
    name: string;
    nameEmbedding: number[];
  };
  name: string;
  nameEmbedding: number[];
  postgresId: string;
  pages: Neo4jPage[];
}