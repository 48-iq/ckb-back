import { Module } from "@nestjs/common";
import { GigachatProvider } from "./gigachat.provider";

@Module({
  providers: [GigachatProvider],
  exports: [GigachatProvider]
}) 
export class GigaChatModule {}