import { NodeType } from "./node-type.type"

export type Node = {
  id: number
  name: string
  data: string
  relations?: {id: number, type: NodeType, name: string}[]
  type: NodeType
  documents: {id: number, name: string}[]
}