import { NodeType } from "./node-type.type"
import { Node } from "./node.entity"

export type RelatedNode = Node & {
  relations: {id: number, type: NodeType, name: string}[]
}