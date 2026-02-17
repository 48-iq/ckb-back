export type NewNode =  {
  id: string;
  name: string;
  data: string;
  type: NodeType;
  semanticType: string;
  embedding: number[];
  parentId: string;
} & Record<string, string>;

export type NodeType = "Contract" 
| "Document" 
| "Paragraph" 
| "Fact" 
| "Entity";