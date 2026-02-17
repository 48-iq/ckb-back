import { ProcessedFact } from "./processed-fact.entity";


export interface ProcessedParagraph {
  name: string
  text: string
  facts: ProcessedFact[];
}