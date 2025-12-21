import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmbeddingModelProvider } from "./embedding-model.provider";
import { EmbeddingService } from "./embedding.service";


@Module({
  imports: [ConfigModule],
  providers: [EmbeddingModelProvider, EmbeddingService],
  exports: [EmbeddingService]
})
export class EmbeddingModule {}