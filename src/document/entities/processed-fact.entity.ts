import { ProcessedEntity } from "./processed-entity.entity";


export interface ProcessedFact {
  name: string;
  text: string;
  entities: ProcessedEntity[];
}