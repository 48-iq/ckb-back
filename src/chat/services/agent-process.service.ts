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
    await this.wsGateway.sendEvent(
      'messageCreated', 
      this.messageMapper.toDto(responseMessage, { streaming: true }),
      userId
    );

    chat.lastMessageAt = responseMessage.createdAt;
    let chatDto = this.chatMapper.toChatDto(chat);
    await this.wsGateway.sendEvent('chatUpdated', chatDto, userId);
    
    try {
      
      const response = await this.agentService.processMessages(messages, chat.id);
       
      //Обработка потокового ответа от агента, отправка событий об обновлении сообщения
      for await (const [type, chunk] of response) {
        if (type === "custom" && chunk instanceof ResultCustomChunk && chunk.type === 'result') {
          responseMessage.text = chunk.text;
          await this.wsGateway.sendEvent(
            'messageUpdated', 
            this.messageMapper.toDto(responseMessage, { streaming: true }),
            userId
          );
        }
  
        if (type === "updates") {
  
          if (chunk.resultNode) {
            const result: string = chunk.resultNode.result as string??"";
            responseMessage.text = result;
            await this.wsGateway.sendEvent(
              'messageUpdated', 
              this.messageMapper.toDto(responseMessage, { streaming: true }),
              userId
            );
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
            await this.wsGateway.sendEvent(
              'messageUpdated', 
              this.messageMapper.toDto(responseMessage, { streaming: true }),
              userId
            );
          }
        }
      }
      responseMessage = await this.messageRepository.save(responseMessage);
    } catch(error) {
      responseMessage.error = "Ошибка во время обработки сообщения";
      responseMessage = await this.messageRepository.save(responseMessage);
      await this.wsGateway.sendEvent(
        'messageUpdated', 
        this.messageMapper.toDto(responseMessage, { streaming: false }),
        userId
      );
      throw error;
    } finally {
      await this.wsGateway.sendEvent(
        'messageUpdated', 
        this.messageMapper.toDto(responseMessage, { streaming: false }),
        userId
      );
    }
  }


  private createEmptyAssistantMessage(chat: Chat) {
    const message = new Message();
    message.chat = chat;
    message.role = "assistant";
    message.text = "";
    message.documents = [];
    return message;
  }
}