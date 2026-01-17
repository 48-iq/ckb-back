import { Inject } from "@nestjs/common"
import { GIGACHAT } from "./gigachat.provider"


export function InjectGigachat(): ParameterDecorator {
  return Inject(GIGACHAT);
}