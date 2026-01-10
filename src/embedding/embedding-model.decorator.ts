import { Inject } from "@nestjs/common";
import { EMBEDDING_MODEL } from "./embedding-model.provider";


export function InjectEmbeddingModel(): ParameterDecorator {
  return Inject(EMBEDDING_MODEL);
}