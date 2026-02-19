import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { Driver, Transaction } from "neo4j-driver";
import { NewNode, type NodeType } from "../types/new-node.type";
import { InjectNeo4j } from "../../neo4j/neo4j.decorator";

@Injectable()
export class GraphInsertService implements OnApplicationShutdown, OnApplicationBootstrap {
  constructor(
    @InjectNeo4j() private readonly driver: Driver
  ) {}
  async onApplicationBootstrap() {
    const session = this.driver.session();
    try {
      await session.run(`
        CREATE VECTOR INDEX node_embedding_index 
        IF NOT EXISTS
        FOR (n:Embeddable) on (n.embedding)
        OPTIONS { indexConfig: {
          \`vector.dimensions\`: 2560,
          \`vector.similarity_function\`: "cosine"
        }}  
      `);
    } finally {
      session.close();
    }
  }

  async onApplicationShutdown() {
    await this.driver.close();
  }

  private async createRelation(tx: Transaction, 
    nodeId: string, 
    parentNodeId: string
  ) {
    await tx.run(`
      MATCH (p {id: $parentNodeId})
      MATCH (n {id: $nodeId})
      MERGE (p)-[:HAS]->(n)
    `, { parentNodeId, nodeId });
  }

  private async saveNode(args: {
    tx: Transaction,  
    node:  NewNode
  }) {
    const { tx, node } = args;
    let additionalFields = "";
    for (const key of Object.keys(node)) {
      if (
        key !== "id" &&
        key !== "data" &&
        key !== "name" &&
        key !== "embedding"
      ) {
        if (additionalFields.length > 0) additionalFields += `\n`;
        additionalFields += `SET n.${key} = $${key}`;
      }
    }
    const result = await tx.run<{id: string, data: string, type: NodeType, name: string}>(`
      MERGE (n:${node.type} {data: $data, type: $type})
      ON CREATE SET 
        n.id = $id,
        n:Embeddable
      SET n.embedding = $embedding
      SET n.name = $name
      ${additionalFields}
      RETURN n.id as id
    `, { ...args.node });
    if (node.parentId) {
      await this.createRelation(
        tx, 
        result.records.map(r => r.get("id"))[0], 
        node.parentId
      );
    };
    return result.records.map(r => {r.get("id").low})[0];
  }

  async saveDocument(nodes: {
    contract: NewNode,
    document: NewNode,
    paragraphs: NewNode[],
    facts: NewNode[],
    entities: NewNode[]
  }): Promise<number> {
    const session = this.driver.session();
    try {
      const tx = await session.beginTransaction();
      try {
        await this.saveNode({ tx, node: nodes.contract });
        await this.saveNode({ tx, node: nodes.document });
        for (const paragraph of nodes.paragraphs) {
          await this.saveNode({ tx, node: paragraph});
        }
        for (const fact of nodes.facts) {
          await this.saveNode({ tx, node: fact});
        }
        for (const entity of nodes.entities) {
          await this.saveNode({ tx, node: entity});
        }
        await tx.commit();
        await tx.close();
        return 1;
      } catch(err) {
        await tx.rollback();
        throw err;
      } 
    } finally {
      session.close();
    }
  }

}

