import { Inject } from "@nestjs/common"
import { GIGACHAT } from "./gigachat.provider"


export const GigachatDecorator: ParameterDecorator = () =>{
  return Inject(GIGACHAT);
}