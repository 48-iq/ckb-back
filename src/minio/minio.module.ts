import { Global, Module } from "@nestjs/common";
import { MinioClientProvider } from "./minio-client.provider";


@Global()
@Module({
  providers: [MinioClientProvider],
  exports: [MinioClientProvider],
})
export class MinioModule {}