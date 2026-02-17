import { Injectable, Provider } from "@nestjs/common";
import { EmbeddingService } from "src/embedding/embedding.service";
import { GraphInsertService } from "src/document/services/graph-insert.service";
import { Function as GigachatFunction } from "gigachat/interfaces";
import { ConfigService } from "@nestjs/config";
import { NodeNotFoundError } from "src/neo4j/node-not-found.error";

@Injectable()
export class FunctionsService {


  private readonly ENDING = "...(Данные сокращены, используй full_node_by_id для получения полных данных)";
  private readonly maxNodeDataLength: number;
  constructor(
    private readonly neo4jRepository: GraphInsertService, 
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService
  ) {
    this.maxNodeDataLength = +(this.configService.get<string>('MAX_NODE_DATA_LENGTH')||'500');
  }

  private async fullNodeById(args: {id: number}) {
    if (args.id === undefined) return {
      result: "Неверные аргументы, используй {id: number} и попробуй еще раз."
    }
    try {
      const result = await this.neo4jRepository.getNodeById(args.id);
      return result;
    } catch (e) {
      if (e instanceof NodeNotFoundError) {
        return {
          result: "Данного узла не существует, проверь id узла и попробуй ещё раз."
        };
      } else {
        throw e;
      }
    }
  }

  private async nodeById(args: {id: number}) {
    const result = await this.neo4jRepository.getNodeById(args.id);
    if (result.data.length > this.maxNodeDataLength) {
      result.data = result.data.slice(0, this.maxNodeDataLength - this.ENDING.length);
      result.data += this.ENDING;
    }
    return result;
  }

  private async vectorSearch(args: any) {
    if(args.page === undefined || args.query === undefined) return {
      result: "Неверные аргументы, используй {query: string, page: number} и попробуй еще раз."
    };
    if (typeof args.page !== "number") return {
      result: "Параметр page должен быть числом, попробуй еще раз."
    };
    if (args.page < 1) return {
      result: "Параметр page должен быть >= 1, попробуй еще раз."
    };
    if (typeof args.query !== "string") return {
      result: "Параметр query должен быть строкой, попробуй еще раз."
    };
    if (args.query.length > 2000) return {
      result: "Параметр query должен быть <= 2000 символов, попробуй еще раз."
    };
    const embedding = await this.embeddingService.getEmbedding(args.query);
    const result = await this.neo4jRepository.vectorSearch(embedding, args.page);
    for (let i = 0; i < result.length; i++) {
      const node = result[i];
      if (node.data.length > this.maxNodeDataLength) {
        node.data = node.data.slice(0, this.maxNodeDataLength - this.ENDING.length);
        node.data += this.ENDING;
      }
    }
    return { nodes: result };
  }

  async useFunctionByName(name: string, args: any) {
    switch (name) {
      case "vector_search":
        return await this.vectorSearch(args);
      case "full_node_by_id":
        return await this.fullNodeById(args);
      case "node_by_id":
        return await this.nodeById(args);
      default: 
        return {
          result: "Данной функции не существует, проверь название функции и попробуй ещё раз"
        };
    }
  }

  getFunctions(): GigachatFunction[] {
    return [
      {
        name: "vector_search",
        description: "Постраничный векторный поиск узлов графа, наиболее близких по смыслу к query, " +
        "нумерация страниц начинается с 1, размер страницы 10.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Запрос, по которому ищутся узлы."
            },
            page: {
              type: "number",
              description: "Номер страницы ( >= 1)"
            }
          },
          required: ["query", "page"]
        },
        return_parameters: {
          type: "object",
          properties: {
            nodes: {
              type: "array",
              item: {
                type: "object",
                properties: {
                  id: {
                    type: "number",
                    description: "ID элемента графа"
                  },
                  name: {
                    type: "string",
                    description: "Название элемента графа, которое кратко описывает его данные"
                  },
                  data: {
                    type: "string",
                    description: "Данные элемента графа"
                  },
                  type: {
                    type: "string",
                    description: "Тип элемента графа: Contract|Document|Page|Paragraph|Fact|Entity"
                  },
                  documents: {
                    type: "array",
                    description: "Элементы графа типа Document, которые относятся к текущему элементу графа",
                    item: {
                      type: "object",
                      properties: {
                        id: {
                          type: "number",
                          description: "ID элемента графа"
                        },
                        name: {
                          type: "string",
                          description: "Название элемента графа, которое кратко описывает его данные"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        name: "node_by_id",
        description: "Получение узла графа по его ID.",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "ID элемента графа"
            }
          },
          required: ["id"]
        },
        return_parameters: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "ID элемента графа"
            },
            name: {
              type: "string",
              description: "Название элемента графа, которое кратко описывает его данные"
            },
            data: {
              type: "string",
              description: "Данные элемента графа"
            },
            type: {
              type: "string",
              description: "Тип элемента графа: Contract|Document|Page|Paragraph|Fact|Entity"
            },
            relations: {
              type: "array",
              description: "Элементы графа, которые связанны с текущим элементом графа, отсортированные по близости смысла к текущему элементу графа",
              item: {
                type: "object",
                properties: {
                  id: {
                    type: "number",
                    description: "ID элемента графа"
                  },
                  type: {
                    type: "string",
                    description: "Тип элемента графа: Contract|Document|Page|Paragraph|Fact|Entity"
                  },
                  name: {
                    type: "string",
                    description: "Название элемента графа, которое кратко описывает его данные"
                  }
                }
              }
            },
            documents: {
              type: "array",
              description: "Элементы графа типа Document, которые относятся к текущему элементу графа",
              item: {
                type: "object",
                properties: {
                  id: {
                    type: "number",
                    description: "ID элемента графа"
                  },
                  name: {
                    type: "string",
                    description: "Название элемента графа, которое кратко описывает его данные"
                  }
                }
              }
            }
          }
        }
      },
      {
        name: "full_node_by_id",
        description: "Получение узла графа по его ID с данными полной длинны, использовать только если в данных узла есть пометка '...(Данные сокращены, используй full_node_by_id для получения полных данных)'",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "ID элемента графа"
            }
          }
        },
        return_parameters: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "ID элемента графа"
            },
            name: {
              type: "string",
              description: "Название элемента графа, которое кратко описывает его данные"
            },
            data: {
              type: "string",
              description: "Данные элемента графа"
            },
            type: {
              type: "string",
              description: "Тип элемента графа: Contract|Document|Page|Paragraph|Fact|Entity"
            },
            relations: {
              type: "array",
              description: "Элементы графа, которые связанны с текущим элементом графа, отсортированные по близости смысла к текущему элементу графа",
              item: {
                type: "object",
                properties: {
                  id: {
                    type: "number",
                    description: "ID элемента графа"
                  },
                  type: {
                    type: "string",
                    description: "Тип элемента графа: Contract|Document|Page|Paragraph|Fact|Entity"
                  },
                  name: {
                    type: "string",
                    description: "Название элемента графа, которое кратко описывает его данные"
                  }
                }
              }
            },
            documents: {
              type: "array",
              description: "Элементы графа типа Document, которые относятся к текущему элементу графа",
              item: {
                type: "object",
                properties: {
                  id: {
                    type: "number",
                    description: "ID элемента графа"
                  },
                  name: {
                    type: "string",
                    description: "Название элемента графа, которое кратко описывает его данные"
                  }
                }
              }
            }
          }
        }
      }
    ]
  }

  
}
