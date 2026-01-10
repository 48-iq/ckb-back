import { Injectable } from "@nestjs/common";
import { EmbeddingService } from "src/embedding/embedding.service";


@Injectable()
export class DocumentEmbeddingService {

  constructor(
    private readonly embeddingService: EmbeddingService
  ) {}


  


}