import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat } from "src/postgres/entities/chat.entity";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm";
import { ChatMapper } from "./mappers/chat.mapper";
import { Message } from "src/postgres/entities/message.entity";
import { AppError } from "src/app.error";
import { NewUserMessageDto } from "./dto/new-user-message.dto";
import { WsGateway } from "src/ws/ws.gateway";
import { ChatUpdateEvent } from "./events/chat-update.event";
import { MessageMapper } from "./mappers/message.mapper";
import { PageDto } from "./dto/page.dto";
import { ChatDto } from "./dto/chat.dto";
import { PageMapper } from "./mappers/page.mapper";
import { MessageDto } from "./dto/message.dto";
import { AgentService } from "src/agent/agent.service";
import { MessageUpdateEvent } from "./events/message-update.event";
import { DocumentDto } from "src/document/dto/document.dto";
import { Neo4jRepository } from "src/neo4j/neo4j.repository";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentMapper } from "src/document/mappers/document.mapper";
@Injectable()
export class ChatService {
  
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>, 
    @InjectRepository(Document) private readonly documentRepository: Repository<Document>,
    private readonly neo4jRepository: Neo4jRepository,
    private readonly agentService: AgentService,
    private readonly wsGateway: WsGateway,
    private readonly chatMapper: ChatMapper,
    private readonly messageMapper: MessageMapper,
    private readonly pageMapper: PageMapper,
    private readonly documentMapper: DocumentMapper
  ) {}

  async getNewChat(userId: string) {
    const user = await this.userRepository.findOneByOrFail({ id: userId })
    let chat = await this.chatRepository.findOne({
      where: {
        user: {
          id: user.id
        },
        isNew: true
      }
    });

    if (chat === null) {
      chat = new Chat();
      chat.user = user;
      chat.title = "Новый чат";
      chat.isNew = true;
      chat = await this.chatRepository.save(chat);
    }
    return this.chatMapper.toDto(chat);
  }

  async getUserChats(args: {
    userId: string;
    page: number;
    size: number;
  }): Promise<PageDto<ChatDto>> {
    const { userId, page, size } = args;
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) throw new AppError("USER_NOT_FOUND");

    const totalItems = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.isNew = false')
      .andWhere('chat.userId = :userId', { userId })
      .getCount();

    const qb = this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.isNew = false')
      .andWhere('chat.userId = :userId', { userId })
      .addSelect(subQuery => {
        return subQuery
          .select('MAX(message.createdAt)')
          .from(Message, 'message')
          .where('message.chatId = chat.id')
      }, 'lastMessageAt')
      .orderBy('lastMessageAt', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    const { entities, raw } = await qb.getRawAndEntities();

    entities.forEach((chat, index) => {
      chat.lastMessageAt = raw[index].lastMessageAt
    });

    const chatPageDto = this.pageMapper.toDto<Chat, ChatDto>({
      page,
      size,
      totalItems,
      data: entities,
      dataMapper: (entity: Chat) => {
        return this.chatMapper.toDto(entity);
      }
    })
    return chatPageDto;
  }

  async getChatMessages(args: {
    chatId: string;
    page: number;
    size: number;
  }) {
    const { chatId, page, size } = args;

    const chat = await this.chatRepository.findOneBy({ id: chatId });

    if (!chat) throw new AppError("CHAT_NOT_FOUND");

    const totalItems = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatId = :chatId', { chatId })
      .getCount();

    const qb = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatId = :chatId', { chatId })
      .skip((page - 1) * size)
      .take(size);

    const { entities } = await qb.getRawAndEntities();

    const messagePageDto = this.pageMapper.toDto<Message, MessageDto>({
      data: entities,
      page,
      size,
      totalItems,
      dataMapper: (entity: Message) => {
        return this.messageMapper.toDto({ 
          message: entity, 
          chat, 
          documents: entity.documents.map(doc => ({ document: doc, contract: doc.contract }))
        });
      }
    });
    return messagePageDto;
  }

  async sendMessage(args: {
      userId: string;
      newUserMessageDto: NewUserMessageDto;
    }) {
    const { userId, newUserMessageDto } = args;

    let chat = await this.chatRepository.findOneBy({ id: newUserMessageDto.chatId });
    if (!chat) throw new AppError("CHAT_NOT_FOUND");

    let message = this.messageMapper.toEntity({
      chat,
      dto: newUserMessageDto
    });

    chat.isPending = true;
    chat.isNew = false;
    chat = await this.chatRepository.save(chat);
    if (!chat) throw new AppError("CHAT_NOT_FOUND");
    
    message = await this.messageRepository.save(message);

    const event: ChatUpdateEvent = new ChatUpdateEvent({
      id: chat.id,
      newMessage: this.messageMapper.toDto({
        message: message,
        chat
      }),
      isPending: chat.isPending
    });

    await this.wsGateway.sendEvent(
      'newMessage', event,
      userId
    );

    const qb = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatId = :chatId', { chatId: chat.id })
      .orderBy('message.createdAt', 'DESC');
    
    const { entities } = await qb.getRawAndEntities();

    const chatMessagesDto = entities.map(entity => this.messageMapper.toDto({
      message: entity, 
      chat: chat!, 
      documents: entity.documents.map(doc => ({ document: doc, contract: doc.contract }))
    }));

    const result = await this.agentService.processChat(chatMessagesDto)

    for await (const [type, chunk] of result) {
      if (type === "custom") {
        if (chunk.type === "result") {
          const data = chunk.data;
          const messageUpdateEvent = new MessageUpdateEvent({
            id: message.id,
            chatId: chat.id,
            text: data.text,
            updateText: data.updateText
          });
          await this.wsGateway.sendEvent(
            'updateMessage',
            messageUpdateEvent,
            userId
          );
        }
      }
      if (type === "updates") {
        if (chunk.documentsNode) {
          const documentsNeo4jIds: number[] = chunk.documentsNode.documents as number[];
          const documentsPostgresIds: string[] = [];
          for (const neo4jId of documentsNeo4jIds) {
            const postgresId = await this.neo4jRepository.getDocumentPostgresId(neo4jId);
            if (postgresId) documentsPostgresIds.push(postgresId);
          }
          const documents: Document[] = [];
          for (const docId of documentsPostgresIds) {
            let document = await this.documentRepository.findOneBy({ id: docId });
            if (document) {
              documents.push(document);
            }
          }
          message.documents = documents;
          message =  await this.messageRepository.save(message);
          const messageUpdateEvent = new MessageUpdateEvent({
            id: message.id,
            chatId: chat.id,
            documents: message.documents.map(doc => this.documentMapper.toDto({ document: doc, contract: doc.contract })),
          });
          await this.wsGateway.sendEvent(
            'updateMessage',
            messageUpdateEvent,
            userId
          );
        }
      }
    }

    chat.isPending = false;
    chat = await this.chatRepository.save(chat);

    this.wsGateway.sendEvent(
      'updateChat',
      new ChatUpdateEvent({
        id: chat.id,
        isPending: chat.isPending
      }),
      userId
    );
  }
}