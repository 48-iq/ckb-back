import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { Driver, int, Integer, Transaction } from "neo4j-driver";
import { NodeType } from "./node-type.type";
import { NewDocument } from "./new-document.interface";
import { SavedDocument } from "./saved-document.interface";
import { Node } from "./node.entity";
import { NodeNotFoundError } from "./node-not-found.error";

@Injectable()
export class Neo4jRepository implements OnApplicationShutdown, OnApplicationBootstrap {
  constructor(
    @Inject('NEO4J_DRIVER') private readonly driver: Driver
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

  private async _genId(tx: Transaction) {
    const result = await tx.run<{sequence: Integer}>(`
        MERGE (s:Sequence {name: 'global'})
        ON CREATE SET s.sequence = 0
        SET s.sequence = s.sequence + 1
        RETURN s.sequence as sequence;
      `);
    return result.records.map(r => r.get("sequence"))[0];
  }

  private async _createRelation(tx: Transaction, 
    nodeId: number, 
    parentNodeId: number
  ) {
    await tx.run(`
      MATCH (p {id: $parentNodeId})
      MATCH (n {id: $nodeId})
      MERGE (p)-[:HAS]->(n)
    `, { parentNodeId, nodeId });
  }

  private async _saveNode(tx: Transaction, params: {
    data: string
    name: string
    embedding: number[]
    type: NodeType
    parentNodeId?: number
  }) {
    const id = await this._genId(tx)
    const result = await tx.run<{id: Integer, data: string, type: NodeType, name: string}>(`
      MATCH (s:Sequence {name: 'global'})
      MERGE (n:${params.type} {data: $data, type: $type})
      ON CREATE SET 
        n.id = $id,
        n:Embeddable
      SET 
        n.embedding = $embedding,
        n.name = $name
      RETURN n.id as id, n.data as data, n.type as type, n.name as name
    `, {
      id: id,
      data: params.data,
      name: params.name,
      embedding: params.embedding,
      type: params.type
    })
    if (params.parentNodeId) {
      await this._createRelation(
        tx, 
        result.records.map(r => r.get("id").low)[0], 
        params.parentNodeId
      )
    }
    return result.records.map(r => {return {
      id: r.get("id").low,
      data: r.get("data"),
      type: r.get("type"),
      name: r.get("name")
    }})[0]
  }

  async saveDocument(newDocument: NewDocument): Promise<SavedDocument> {
    const session = this.driver.session()
    try {
      const tx = await session.beginTransaction()

      try {

        const savedContract = await this._saveNode(tx, {
          name: newDocument.contract.name,
          data: newDocument.contract.name,
          embedding: newDocument.contract.nameEmbedding,
          type: "Contract"
        });
  
        const savedDocument = await this._saveNode(tx, {
          name: newDocument.name,
          data: newDocument.name,
          embedding: newDocument.nameEmbedding,
          type: "Document",
          parentNodeId: savedContract.id
        });
  
        const savedPages = await Promise.all(newDocument.pages.map(async (page) => {
          const savedPage = await this._saveNode(tx, {
            name: page.name,
            data: page.text,
            embedding: page.textEmbedding,
            type: "Page",
            parentNodeId: savedDocument.id
          });
          const savedParagraphs = await Promise.all(page.paragraphs.map(async (paragraph) => {
            const savedParagraph = await this._saveNode(tx, {
              data: paragraph.text,
              name: paragraph.name,
              embedding: paragraph.textEmbedding,
              type: "Paragraph",
              parentNodeId: savedPage.id
            });
            const savedFacts = await Promise.all(paragraph.facts.map(async (fact) => {
              const savedFact = await this._saveNode(tx, {
                data: fact.text,
                name: fact.name,
                embedding: fact.textEmbedding,
                type: "Fact",
                parentNodeId: savedParagraph.id
              });
              const savedEntities = await Promise.all(fact.entities.map(async (entity) => {
                const savedEntity = await this._saveNode(tx, {
                  data: entity.name,
                  name: entity.name,
                  embedding: entity.nameEmbedding,
                  type: "Entity",
                  parentNodeId: savedFact.id
                })
                return {
                  id: savedEntity.id,
                  name: savedEntity.name
                }
              }))
              return {
                id: savedFact.id,
                name: savedFact.name,
                text: savedFact.data,
                entities: savedEntities
              }
            }))
            return {
              id: savedParagraph.id,
              name: savedParagraph.name,
              text: savedParagraph.data,
              facts: savedFacts
            }
          }))
          return {
            id: savedPage.id,
            name: savedPage.name,
            text: savedPage.data,
            paragraphs: savedParagraphs
          }
        }))
        await tx.commit()
        await tx.close()
        return {
          pages: savedPages,
          id: savedDocument.id,
          name: savedDocument.name,
          contract: {
            id: savedContract.id,
            name: savedContract.name
          }
        }
      } catch(err) {
        await tx.rollback()
        throw err
      } 
    } finally {
      session.close()
    }
  }


  async getNodeById(id: number): Promise<Node> {
    const session = this.driver.session()
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
        `,{id: int(id)})
        if (result.records.length === 0)
          throw new NodeNotFoundError(`Node with id ${id} not found`)
        return result.records.map(r => {return {
          id: r.get("id").low,
          data: r.get("data"),
          type: r.get("type"),
          name: r.get("name"),
          relations: r.get("relations").map(x => {return {id: x.id.low, type: x.type, name: x.name}}),
          documents: r.get("documents").map(x => {return {id: x.id.low, name: x.name}})
        }})[0]
      })
    } finally {
      session.close()
    }
  }

  async  vectorSearch(
    embedding: number[],
    page: number
  ): Promise<Node[]> {
    const session = this.driver.session()

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
        `, {queryVector: embedding, skip: int((page - 1) * 10)})
        return result.records.map(r => {return {
          id: r.get("id").low,
          data: r.get("data"),
          type: r.get("type"),
          name: r.get("name"),
          documents: r.get("documents").map(x => {return {id: x.id.low, name: x.name}})
        }})
      })

    } finally {
      session.close()
    }

  }

}