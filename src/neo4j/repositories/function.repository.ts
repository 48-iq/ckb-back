import { Injectable } from "@nestjs/common";
import { InjectNeo4j } from "../neo4j.decorator";
import { Driver, Integer } from "neo4j-driver";
import { NodeType } from "../new-node.type";


@Injectable()
export class FunctionsRepository {

  constructor(
    @InjectNeo4j() private readonly driver: Driver
  ) {}

  async getNodeById(id: number): Promise<RelatedNode> {
    const session = this.driver.session();
    try {
      return await session.executeRead(async tx => {
        const result = await tx.run<{
          id: Integer,
          data: string,
          type: NodeType,
          name: string,
          relations: {id: Integer, type: NodeType, name: string}[]
          documents: {id: Integer, name: string}[]
        }>(`
          MATCH (n {id: $id})
            WHERE n:Contract OR n:Document OR n:Page OR n:Paragraph OR n:Fact OR n:Entity
            WITH n

            MATCH (n)-[:HAS]-(m)
            WHERE (m:Contract OR m:Document OR m:Page OR m:Paragraph OR m:Fact OR m:Entity)
              AND m.embedding IS NOT NULL

            WITH n, m,
                vector.similarity.cosine(m.embedding, n.embedding) AS score
            ORDER BY score DESC

            OPTIONAL MATCH (d:Document)
            WHERE
              (n:Document AND d = n)
              OR
              (n:Contract AND (n)-[:HAS]->(d))
              OR
              (NOT n:Contract AND NOT n:Document AND (d)-[:HAS*]->(n))

            WITH
              n,
              m,
              score,
              collect(DISTINCT {id: d.id, name: d.name}) AS documents

          RETURN
            n.id   AS id,
            n.name AS name,
            n.data AS data,
            n.type AS type,
            collect({id: m.id, type: m.type, name: m.name}) AS relations,
            documents
        `,{id: int(id)});
        if (result.records.length === 0)
          throw new NodeNotFoundError(`Node with id ${id} not found`);
        return result.records.map(r => {return {
          id: r.get("id").low,
          data: r.get("data"),
          type: r.get("type"),
          name: r.get("name"),
          relations: r.get("relations").map(x => {return {id: x.id.low, type: x.type, name: x.name}}),
          documents: r.get("documents").map(x => {return {id: x.id.low, name: x.name}})
        }})[0];
      })
    } finally {
      session.close();
    }
  }

  async  vectorSearch(
    embedding: number[],
    page: number
  ): Promise<Node[]> {
    const session = this.driver.session();
    try {
      return await session.executeRead(async tx => {
        const result = await tx.run<{
          id: Integer
          data: string
          type: NodeType
          name: string,
          documents: {id: Integer, name: string}[]
        }>(`
          MATCH (n)
          WHERE (n:Page OR n:Paragraph OR n:Fact OR n:Entity)
            AND n.embedding IS NOT NULL

          WITH n,
              vector.similarity.cosine(n.embedding, $queryVector) AS score
          ORDER BY score DESC
          SKIP $skip
          LIMIT 10

          OPTIONAL MATCH (d:Document)-[:HAS*1..5]->(n)

          WITH
            n,
            score,
            collect(DISTINCT {id: d.id, name: d.name}) AS documents

          RETURN
            n.id   AS id,
            n.data AS data,
            n.type AS type,
            n.name AS name,
            documents AS documents
        `, {queryVector: embedding, skip: int((page - 1) * 10)});
        return result.records.map(r => {return {
          id: r.get("id").low,
          data: r.get("data"),
          type: r.get("type"),
          name: r.get("name"),
          documents: r.get("documents").map(x => {return {id: x.id.low, name: x.name}})
        }});
      })
    } finally {
      session.close();
    }
  }

  async getDocumentPostgresId(documentId: number): Promise<string|null> {
    const session = this.driver.session();
    try {
      const result = await session.executeRead(async tx => {
        const result = await tx.run<{postgres_id: string}>(
          `
            MATCH (d:Document {id: $documentId})
            RETURN d.postgres_id as postgres_id
          `, {documentId: int(documentId)});
        if (result.records.length === 0)
          return null;
        return result.records.map(r => r.get("postgres_id"))[0];
      });
      return result;
    } finally {
      session.close();
    }
  }
}