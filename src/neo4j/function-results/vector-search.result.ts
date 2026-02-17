import { NodeType } from "../../document/types/new-node.type";

export type VectorSearchResult = {
  id: string;
  name: string;
  score: number;
  semanticType: string;
  type: NodeType;
}