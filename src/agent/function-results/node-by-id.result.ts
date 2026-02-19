import { NodeType } from "../../document/types/new-node.type";

export type NodeByIdResult = {
  id: string;
  name: string;
  data: string;
  type: NodeType;
  relations: { id: string, name: string, type: NodeType, score: number }[]
}