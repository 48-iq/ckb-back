import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat } from "src/postgres/entities/chat.entity";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm";
import { ChatMapper } from "../mappers/chat.mapper";
import { Message } from "src/postgres/entities/message.entity";
import { AppError } from "src/shared/errors/app.error";
import { NewUserMessageDto } from "../dto/new-user-message.dto";
import { WsGateway } from "src/ws/ws.gateway";
import { ChatUpdatedEvent } from "../events/chat-updated.event";
import { MessageMapper } from "../mappers/message.mapper";
import { CursorDto } from "../../shared/dto/cursor.dto";
import { ChatDto } from "../dto/chat.dto";
import { CursorMapper } from "../../shared/mappers/cursor.mapper";
import { MessageDto } from "../dto/message.dto";
import { AgentService } from "src/agent/services/agent.service";
import { MessageUpdatedEvent } from "../events/message-updated.event";
import { Neo4jRepository } from "src/neo4j/neo4j.repository";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentMapper } from "src/document/mappers/document.mapper";
import { ChatDeletedEvent } from "../events/chat-deleted.event";
import { GenerateTitleService } from "./generate-title.service";
import { ResultCustomChunk } from "../chunks/result.custom.chunk";
@Injectable()
export class ChatService {

  private readonly logger = new Logger(ChatService.name);
  
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
    private readonly cursorMapper: CursorMapper,
    private readonly documentMapper: DocumentMapper,
    private readonly generateTitleService: GenerateTitleService
  ) {}

  async deleteChat(chatId: string, userId: string) {
    const chat = await this.chatRepository.findOneBy({ id: chatId });
    if (chat?.user.id !== userId) throw new AppError("PERMISSION_DENIED");
    if (chat && !chat.isNew) {
      if (chat.isPending) {
        await this.agentService.stopChat(chatId);
      }
      await this.chatRepository.remove(chat);
      this.wsGateway.sendEvent('chatDeleted', new ChatDeletedEvent(chatId), userId);
    }
  }

  async getNewChat(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new AppError("USER_NOT_FOUND");
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
      chat.isPending = false;
      chat.isNew = true;
      chat = await this.chatRepository.save(chat);
    }
    return this.chatMapper.toDto(chat);
  }

  async getUserChats(args: {
    userId: string;
    before: string;
    limit: number;
  }): Promise<CursorDto<ChatDto>> {
    const { userId, before, limit } = args;
    this.logger.log(`getUserChats userId: ${userId}, before: ${before}, limit: ${limit}`);
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) throw new AppError("USER_NOT_FOUND");

    const qb = this.chatRepository
      .createQueryBuilder('chat')
      .addSelect(subQuery => {
        return subQuery
        .select('MAX(message.createdAt)')
        .from(Message, 'message')
        .where('message.chatId = chat.id')
      }, 'lastMessageAt')
      .where('chat.isNew = false')
      .andWhere('chat.userId = :userId', { userId })
      .andWhere('chat.createdAt < :before', { before: new Date(before) })
      .orderBy('"lastMessageAt"', 'DESC')
      .take(limit);

    let itemsLeft = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.isNew = false')
      .andWhere('chat.userId = :userId', { userId })
      .andWhere('chat.createdAt < :before', { before: new Date(before) })
      .getCount() - limit;
    
    if (itemsLeft < 0) itemsLeft = 0;

    const { entities, raw } = await qb.getRawAndEntities();

    entities.forEach((chat, index) => {
      chat.lastMessageAt = raw[index].lastMessageAt
    });

    const chatsCursorDto = this.cursorMapper.toDto<Chat, ChatDto>({
      itemsLeft,
      data: entities,
      dataMapper: (entity: Chat) => {
        return this.chatMapper.toDto(entity);
      }
    });

    return chatsCursorDto;
  }

  async getChatMessagesCursor(args: {
    chatId: string;
    userId: string;
    before: string;
    limit: number;
  }) {
    const { chatId, before, limit, userId } = args;

    const chat = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.user', 'user')
      .where('chat.id = :chatId', { chatId })
      .getOne();

    if (!chat) throw new AppError("CHAT_NOT_FOUND");
    if (chat.user.id !== userId) throw new AppError("PERMISSION_DENIED");

    let messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.documents', 'document')
      .leftJoinAndSelect('document.contract', 'contract')
      .where('message.chatId = :chatId', { chatId })
      .andWhere('message.createdAt < :before', { before: new Date(before) })
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .getMany();
      
    messages = messages.reverse();

    let itemsLeft = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatId = :chatId', { chatId })
      .andWhere('message.createdAt < :before', { before: new Date(before) })
      .getCount() - limit;

    if (itemsLeft < 0) itemsLeft = 0;

    const messagesCursorDto = this.cursorMapper.toDto<Message, MessageDto>({
      data: messages,
      itemsLeft,
      dataMapper: (entity: Message) => {
        return this.messageMapper.toDto({ 
          message: entity, 
          chat, 
          documents: entity.documents.map(doc => ({ document: doc, contract: doc.contract }))
        });
      }
    });

    return messagesCursorDto;
  }

  async sendMessage(args: {
      userId: string;
      newUserMessageDto: NewUserMessageDto;
    }) {

    const { userId, newUserMessageDto } = args;

    //Получение чата, если чат был новым, то отправка события о создании чата
    let chat = await this.getChatWithUser(newUserMessageDto.chatId);

    if (!chat) throw new AppError("CHAT_NOT_FOUND");

    this.logger.log(`
      userId from request: ${userId},
      userid from chat: ${chat.user.id},
      newMessageDto: ${JSON.stringify(newUserMessageDto)},
      fullChat: ${JSON.stringify(chat)}
    `);

    if (chat.user.id !== userId) throw new AppError("PERMISSION_DENIED");
    if (chat.isPending) throw new AppError("CHAT_PENDING");

    try {
      const isChatNew = chat.isNew;
      chat.isPending = true;
      chat.isNew = false;

      //создание сообщения, изменение статуса чата и времени последнего сообщения, отправка события о новом сообщении
      let userMessage = this.messageMapper.toEntity({ chat, dto: newUserMessageDto });

      if (isChatNew) {
        this.logger.log(`before generate title`);
        const title = await this.generateTitleService.generateTitle([userMessage]);
        this.logger.log(`title: ${title}`);
        chat.title = title??"Новый чат";
      }

      chat = await this.chatRepository.save(chat);
      userMessage = await this.messageRepository.save(userMessage);

      if (isChatNew) {
        const chatCreatedEvent: ChatDto = this.chatMapper.toDto(chat);
        await this.wsGateway.sendEvent('chatCreated', chatCreatedEvent, userId);
      }
      
      chat.lastMessageAt = userMessage.createdAt;

      const newUserMessageEvent: ChatUpdatedEvent = this.createChatUpdateEvent(chat, userMessage);

      await this.wsGateway.sendEvent('chatUpdated', newUserMessageEvent, userId);

      //получения всех сообщений в чате для передачи агенту
      this.logger.log("before get chat messages");
      const chatMessages = await this.getChatMessages(chat.id);
      this.logger.log("after get chat messages");
      const chatMessagesDto = chatMessages.map(entity => this.messageMapper.toDto({
        message: entity, 
        chat: chat!, 
        documents: entity.documents.map(doc => ({ document: doc, contract: doc.contract }))
      }));

      if (chatMessagesDto.length === 0) throw new Error("no messages in active chat");
      
      //Передача сообщений агенту
      const response = await this.agentService.processChat(chatMessagesDto, chat.id);

      //Создание и сохранение сообщения-ответа от агента
      let responseMessage = new Message();
      responseMessage.chat = chat;
      responseMessage.role = "assistant";
      responseMessage.text = "";

      responseMessage = await this.messageRepository.save(responseMessage);

      chat.lastMessageAt = responseMessage.createdAt

      //Изменение времени последнего сообщения, отправка события о новом сообщении
      const newResponseMessageEvent = this.createChatUpdateEvent(chat, responseMessage);

      await this.wsGateway.sendEvent('chatUpdated', newResponseMessageEvent, userId);

      //Обработка потокового ответа от агента, отправка событий об обновлении сообщения
      for await (const [type, chunk] of response) {
        if (type === "custom" && chunk instanceof ResultCustomChunk && chunk.type === 'result') {

          const messageUpdateEvent = new MessageUpdatedEvent({
            id: responseMessage.id,
            chatId: chat.id,
            text: chunk.text,
            textUpdate: chunk.textUpdate
          });

          await this.wsGateway.sendEvent('messageUpdated', messageUpdateEvent, userId);
        }

        if (type === "updates") {

          if (chunk.resultNode) {
            const text: string = chunk.resultNode.result as string??"";

            responseMessage.text = text;

            responseMessage =  await this.messageRepository.save(responseMessage);

            const messageUpdateEvent = new MessageUpdatedEvent({
              id: responseMessage.id,
              chatId: chat.id,
              text: responseMessage.text
            });
          
            await this.wsGateway.sendEvent('messageUpdated',messageUpdateEvent,userId);
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
              let document = await this.documentRepository.findOneBy({ id: postgresId });
              if (document) {
                documents.push(document);
              }
            }
            responseMessage.documents = documents;
            responseMessage = await this.messageRepository.save(responseMessage);
            
            const messageUpdateEvent = new MessageUpdatedEvent({
              id: responseMessage.id,
              chatId: chat.id,
              documents: responseMessage.documents.map(doc => this.documentMapper.toDto({ document: doc, contract: doc.contract })),
            });
            await this.wsGateway.sendEvent('messageUpdated', messageUpdateEvent, userId);
          }
        }
      }

      chat.isPending = false;
      chat = await this.chatRepository.save(chat);
      const pendingStopEvent = new ChatUpdatedEvent({
        id: chat.id,
        isPending: chat.isPending
      });
      this.wsGateway.sendEvent('chatUpdated', pendingStopEvent, userId);
      
    } catch (error) {
      this.logger.error(error);
      chat = await this.chatRepository.findOneBy({ id: newUserMessageDto.chatId });
      if (chat) {
        chat.isPending = false;
        await this.chatRepository.save(chat);
      }

      throw new AppError("SEND_MESSAGE_INTERRUPTED");
    }
    
  }

  private createChatUpdateEvent(chat: Chat, newMessage?: Message): ChatUpdatedEvent {
    let newMessageDto = newMessage? this.messageMapper.toDto({
      message: newMessage,
      chat
    }): undefined;
    return new ChatUpdatedEvent({
      id: chat.id,
      newMessage: newMessageDto,
      isPending: chat.isPending,
      lastMessageAt: chat.lastMessageAt?.toISOString()
    });
  }

  private async getChatWithUser(chatId: string) {
    const chat = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.user', 'user')
      .where('chat.id = :chatId', { chatId })
      .getOne();
    return chat;
  }

  private async getChatWithLastMessageAt(chatId: string) {
    const chat = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.id = :chatId', { chatId })
      .addSelect(subQuery => {
        return subQuery
          .select('MAX(message.createdAt)')
          .from(Message, 'message')
          .where('message.chatId = chat.id')
      }, 'lastMessageAt')
      .orderBy('lastMessageAt', 'DESC')
      .getOne();
    return chat;
  }

  private async getChatMessages(chatId: string) {
      return await this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.documents', 'document')
        .leftJoinAndSelect('document.contract', 'contract')
        .leftJoinAndSelect('message.chat', 'chat')
        .where('chat.id = :chatId', { chatId })
        .orderBy('message.createdAt', 'DESC')
        .getMany();
  }
}