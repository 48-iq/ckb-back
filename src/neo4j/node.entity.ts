import { NodeType } from "./node-type.type"

export type Node = {
  id: number
  name: string
  data: string
  type: NodeType
  documents: {id: number, name: string}[]
}