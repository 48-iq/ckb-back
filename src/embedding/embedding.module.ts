import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmbeddingService } from "./embedding.service";


@Global()
@Module({
  providers: [EmbeddingService],
  exports: [EmbeddingService]
})
export class EmbeddingModule {}