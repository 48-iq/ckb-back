import { AgentService } from "src/agent/services/agent.service";
import { Chat } from "src/postgres/entities/chat.entity";
import { Message } from "src/postgres/entities/message.entity";
import { WsGateway } from "src/ws/ws.gateway";
import { Repository } from "typeorm";
import { ChatMapper } from "../mappers/chat.mapper";
import { ResultCustomChunk } from "../chunks/result.custom.chunk";
import { Neo4jRepository } from "src/neo4j/neo4j.repository";
import { Document } from "src/postgres/entities/document.entity";
import { MessageDto } from "../dto/message.dto";
import { MessageMapper } from "../mappers/message.mapper";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";


@Injectable()
export class AgentProcessService {

  constructor(
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>,
    private readonly agentService: AgentService,
    private readonly wsGateway: WsGateway,
    private readonly messageMapper: MessageMapper,
    private readonly neo4jRepository: Neo4jRepository,
    private readonly chatMapper: ChatMapper
  ) {}

  async processMessages(props: {chat: Chat, messages: Message[], userId: string}) {
    const { messages, userId} = props;
    let chat = props.chat;
    
    
    let responseMessage = this.createEmptyAssistantMessage(chat);
    responseMessage = await this.messageRepository.save(responseMessage);
    let responseMessageDto: MessageDto = this.messageMapper.toDto(responseMessage);
    await this.wsGateway.sendEvent('messageCreated', responseMessageDto, userId);

    chat.lastMessageAt = responseMessage.createdAt;
    let chatDto = this.chatMapper.toChatDto(chat);
    await this.wsGateway.sendEvent('chatUpdated', chatDto, userId);
    
    try {
      
      const response = await this.agentService.processMessages(messages, chat.id);
       
      //Обработка потокового ответа от агента, отправка событий об обновлении сообщения
      for await (const [type, chunk] of response) {
        if (type === "custom" && chunk instanceof ResultCustomChunk && chunk.type === 'result') {
          responseMessage.text = chunk.text;
          responseMessageDto = this.messageMapper.toDto(responseMessage);
          await this.wsGateway.sendEvent('messageUpdated', responseMessageDto, userId);
        }
  
        if (type === "updates") {
  
          if (chunk.resultNode) {
            const result: string = chunk.resultNode.result as string??"";
            responseMessage.text = result;
            responseMessageDto = this.messageMapper.toDto(responseMessage);
            await this.wsGateway.sendEvent('messageUpdated', responseMessageDto, userId);
          }
  
          if (chunk.documentsNode) {
            const documentsNeo4jIds: number[] = chunk.documentsNode.documents as number[]??[];
            const documentsPostgresIds: string[] = [];
            for (const neo4jId of documentsNeo4jIds) {
              const postgresId = await this.neo4jRepository.getDocumentPostgresId(neo4jId);
              if (postgresId) documentsPostgresIds.push(postgresId);
            }
            const documents: Document[] = [];
            for (const postgresId of documentsPostgresIds) {
              const document = await this.documentRepository.createQueryBuilder('document')
                .where('document.id = :id', {id: postgresId})
                .leftJoinAndSelect('document.contract', 'contract')
                .getOne();
              if (document) {
                documents.push(document);
              }
            }
            responseMessage.documents = documents;
            responseMessageDto = this.messageMapper.toDto(responseMessage);
            await this.wsGateway.sendEvent('messageUpdated', responseMessageDto, userId);
          }
        }
      }
    } catch(error) {
      throw error;
    } finally {
      responseMessage.streaming = false;
      responseMessage = await this.messageRepository.save(responseMessage);
    }
  }


  private createEmptyAssistantMessage(chat: Chat) {
    const message = new Message();
    message.chat = chat;
    message.role = "assistant";
    message.text = "";
    message.streaming = true;
    message.documents = [];
    return message;
  }
}