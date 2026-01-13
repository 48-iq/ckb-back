import { Provider } from "@nestjs/common"
import { AGENT_MODEL } from "../agent-model.provider"
import { GigaChat } from "langchain-gigachat"
import { State } from "../agent.state"
import { Neo4jRepository } from "src/neo4j/neo4j.repository"
import { EmbeddingService } from "src/embedding/embedding.service"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

export const AGENT_NODE = 'AGENT_NODE'

export const AgentNodeProvider: Provider = {
  provide: AGENT_NODE,
  inject: [AGENT_MODEL, Neo4jRepository, EmbeddingService],
  useFactory: (model: GigaChat, neo4jRepository: Neo4jRepository, embeddingService: EmbeddingService) => {
    return async (state: typeof State.State) => {
      
      const { previousMessages, plan, messages } = state

      const startMessageText = `
        Ты агент - эксперт по документации в строительной отрасли.
        Твоя главная цель, как агента - ответить на вопрос пользователя по базе документов.
        Для достижения этой цели на основе базы документов был создан граф имеющий древовидную структуру.

        Элементы графа:
        - Договора (Contract): содержат название договора.
        - Документы (Document): содержат название документа.
        - Страницы (Page): содержат текст страницы документа.
        - Параграфы (Paragraph): содержат часть текста страницы связанную по смыслу.
        - Факты (Fact): содержат факты полученные после анализа текста параграфа.
        - Сущности (Entity): содержат целевые сущности фактов (объекты, действия, характеристики...).

        Граф имеет следующую структуру:
        Contract -> Document -> Page -> Paragraph -> Fact -> Entity

        каждый узел имеет структуру:
        {
          id: целое число,
          data: текст узла,
          type: тип узла (Contract, Document, Paragraph, Fact, Entity),
          name: название узла, кратко описывающий его содержимое,
          relations?: список связанных узлов, доступен только при запросе конкретного узла,
          documents?: список документов, которые содержат данный узел или которые относятся к контракту (если узел Contract), доступен только при запросе конкретного узла
        }

        Для ответа на вопрос пользователя тебе будут доступны инструменты:
        1) vector_search({query: string, page: number}) - постраничный векторный поиск близких по контексту к query узлов, 
        размер страницы = 10, нумерация начинается с 1;
        2) node_by_id({id: number}) - получение узла по его id и связанных с ним узлов, если узел содержит длинные данные, то они будут обрезаны, а в конце выведется '...длинные данные' ;
        3) full_node_by_id({id: number}) - получение узла по его id с полными данными;

        Для начала работы получи первые узлы с помощью vector_search.
        
        Используя инструменты и логический план, ты должен составить ответ на вопрос пользователя.
        
        Если узел не нужен для ответа на вопрос, а используется как промежуточный для получения нужного узла;
        
        Строго следуй заданному формату.
      `

      const startMessages = [
        new SystemMessage(startMessageText),
        new HumanMessage(userQuery),
        new HumanMessage(plan),
        new HumanMessage(`
          Список самых близких по смыслу к вопросу пользователя
          элементов графа (результат выполнения векторного поиска, страница 1): 
          ${JSON.stringify(mustRelevantNodes)}
        `)
      ] 
      const response = await model.invoke([...messages, ...startMessages]);

      return { messages: [...messages, ...startMessages, response] }
    }
  }
}