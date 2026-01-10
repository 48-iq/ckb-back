import { Global, Module } from "@nestjs/common";
import { MINIO_CLIENT, MinioClientProvider } from "./minio-client.provider";


@Module({
  exports: [MINIO_CLIENT],
  providers: [MinioClientProvider]
})
export class MinioModule {}