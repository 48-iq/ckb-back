import { Global, Module } from "@nestjs/common";
import { MinioClientProvider } from "./minio-client.provider";
import { MinioRepository } from "./minio.repository";


@Global()
@Module({
  providers: [MinioClientProvider, MinioRepository],
  exports: [MinioRepository],
})
export class MinioModule {}