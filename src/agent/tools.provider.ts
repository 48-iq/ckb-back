import { tool } from "@langchain/core/tools"
import { Provider } from "@nestjs/common"
import { EmbeddingService } from "src/embedding/embedding.service"
import { Neo4jRepository } from "src/neo4j/neo4j.repository"
import { NodeNotFoundError } from "src/neo4j/node-not-found.error"
import { z } from "zod"


export const AGENT_TOOLS = "AGENT_TOOLS"

export const toolsProvider: Provider = {
  provide: AGENT_TOOLS,
  useFactory: async (
    neo4jRepository: Neo4jRepository,
    embeddingService: EmbeddingService
  ) => [
    tool(
      async (params: {
        query: string
        page: number,
      }) => {
        const embedding = await embeddingService.getEmbedding(params.query)
        const result = neo4jRepository.vectorSearch(embedding, params.page)
      }, {
        name: "vector_search",
        description: "Постраничный векторный поиск близких по контексту узлов " + 
        "(размер страницы = 10, нумерация начинается с 1)",
        schema: z.object({
          query: z.string().describe("запрос - строка по которой производится поиск"),
          page: z.number().describe("номер страницы")
        })        
      }
    ),

    tool(
      async (params: {
        id: number
      }) =>{
        try {
          return await neo4jRepository.getNodeById(params.id)
        } catch(err) {
          if (err instanceof NodeNotFoundError) {
            return `узел с id ${params.id} не найден, проверьте id и попробуйте ещё раз`
          }
        }
      }, {
        name: "full_node_by_id",
        description: "Получение узла по его id",
        schema: z.object({
          id: z.number().describe("id узла - целое число")
        })
      }
    ),

    tool(
      async (params: {
        id: number
      }) => {
        try {
          const node = await neo4jRepository.getNodeById(params.id)
          if (node.data.length > 1000) {
            node.data = node.data.slice(0, 500) + "...длинные данные"
          }
          return node
        } catch(err) {
          if (err instanceof NodeNotFoundError) {
            return `узел с id ${params.id} не найден, проверьте id и попробуйте ещё раз`
          }
        }
      }, {
        name: "node_by_id",
        description: "Получение узла по его id, если узел содержит длинные данные, " + 
        "то они будут обрезаны, а в конце выведется '...длинные данные'",
        schema: z.object({
          id: z.number().describe("id узла - целое число")
        })
      }
    )
  ]
}
