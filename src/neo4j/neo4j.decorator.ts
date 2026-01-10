import { Inject } from "@nestjs/common";
import { NEO4J_DRIVER } from "./neo4j-driver.provider";


export function InjectNeo4j(): ParameterDecorator {
  return Inject(NEO4J_DRIVER);
}