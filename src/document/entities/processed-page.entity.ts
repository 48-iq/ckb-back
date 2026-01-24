import { ProcessedParagraph } from "./processed-paragraph.entity"


export interface ProcessedPage {
  name: string
  text: string
  paragraphs: ProcessedParagraph[];
}