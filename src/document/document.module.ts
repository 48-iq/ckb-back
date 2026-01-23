import { Module } from "@nestjs/common";
import { DocumentMapper } from "./mappers/document.mapper";



@Module({
  providers: [DocumentMapper],
  exports: [DocumentMapper],
})
export class DocumentModule {}