import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat } from "src/postgres/entities/chat.entity";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm";
import { ChatMapper } from "./mappers/chat.mapper";
import { Message } from "src/postgres/entities/message.entity";
import { AppError } from "src/shared/errors/app.error";
import { NewUserMessageDto } from "./dto/new-user-message.dto";
import { WsGateway } from "src/ws/ws.gateway";
import { ChatUpdatedEvent } from "./events/chat-updated.event";
import { MessageMapper } from "./mappers/message.mapper";
import { CursorDto } from "../shared/dto/cursor.dto";
import { ChatDto } from "./dto/chat.dto";
import { CursorMapper } from "../shared/mappers/cursor.mapper";
import { MessageDto } from "./dto/message.dto";
import { AgentService } from "src/agent/agent.service";
import { MessageUpdatedEvent } from "./events/message-updated.event";
import { Neo4jRepository } from "src/neo4j/neo4j.repository";
import { Document } from "src/postgres/entities/document.entity";
import { DocumentMapper } from "src/document/mappers/document.mapper";
import { ChatDeletedEvent } from "./events/chat-deleted.event";
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
    private readonly cursorMapper: CursorMapper,
    private readonly documentMapper: DocumentMapper
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
    before: string;
    limit: number;
  }): Promise<CursorDto<ChatDto>> {
    const { userId, before, limit } = args;
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) throw new AppError("USER_NOT_FOUND");

    const qb = this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.isNew = false')
      .andWhere('chat.userId = :userId', { userId })
      .andWhere('chat.createdAt < :before', { before: new Date(before) })
      .addSelect(subQuery => {
        return subQuery
          .select('MAX(message.createdAt)')
          .from(Message, 'message')
          .where('message.chatId = chat.id')
      }, 'lastMessageAt')
      .orderBy('lastMessageAt', 'DESC')
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

  async getChatMessages(args: {
    chatId: string;
    userId: string;
    before: string;
    limit: number;
  }) {
    const { chatId, before, limit, userId } = args;

    const chat = await this.chatRepository.findOneBy({ id: chatId });

    if (!chat) throw new AppError("CHAT_NOT_FOUND");
    if (chat.user.id !== userId) throw new AppError("PERMISSION_DENIED");

    const qb = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.documents', 'document')
      .leftJoinAndSelect('document.contract', 'contract')
      .where('message.chatId = :chatId', { chatId })
      .andWhere('message.createdAt < :before', { before: new Date(before) })
      .take(limit);

    let itemsLeft = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatId = :chatId', { chatId })
      .andWhere('message.createdAt < :before', { before: new Date(before) })
      .getCount() - limit;
    if (itemsLeft < 0) itemsLeft = 0;

    const { entities } = await qb.getRawAndEntities();

    const messagesCursorDto = this.cursorMapper.toDto<Message, MessageDto>({
      data: entities,
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
    let chat = await this.chatRepository.findOneBy({ id: newUserMessageDto.chatId });

    if (!chat) throw new AppError("CHAT_NOT_FOUND");
    if (chat.user.id !== userId) throw new AppError("PERMISSION_DENIED");
    if (chat.isPending) throw new AppError("CHAT_PENDING");

    const isChatNew = chat.isNew;
    chat.isPending = true;
    chat.isNew = false;

    try {
      chat = await this.chatRepository.save(chat);
    } catch (error) {
      console.log(error);
      throw new AppError("SEND_MESSAGE_INTERRUPTED");
    }


    if (isChatNew) {
      const chatCreatedEvent: ChatDto = this.chatMapper.toDto(chat);
      await this.wsGateway.sendEvent('chatCreated', chatCreatedEvent, userId);
    }


    //создание сообщения, изменение статуса чата и времени последнего сообщения, отправка события о новом сообщении
    let message = this.messageMapper.toEntity({ chat, dto: newUserMessageDto });

    try {
      message = await this.messageRepository.save(message);
    } catch (error) {
      console.log(error);
      throw new AppError("SEND_MESSAGE_INTERRUPTED");
    }

    const newUserMessageEvent: ChatUpdatedEvent = new ChatUpdatedEvent({
      id: chat.id,
      newMessage: this.messageMapper.toDto({
        message: message,
        chat
      }),
      isPending: chat.isPending,
      lastMessageAt: message.createdAt.toISOString()
    });

    await this.wsGateway.sendEvent('chatUpdated', newUserMessageEvent, userId);


    //получения всех сообщений в чате для передачи агенту
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

    if (chatMessagesDto.length === 0) throw new AppError("SEND_MESSAGE_INTERRUPTED");


    //Передача сообщений агенту
    const response = await this.agentService.processChat(chatMessagesDto, chat.id)


    //Создание и сохранение сообщения-ответа от агента
    let responseMessage = new Message();
    responseMessage.chat = chat;
    responseMessage.role = "assistant";
    responseMessage.text = "";
    try {
      responseMessage = await this.messageRepository.save(responseMessage);
    } catch (error) {
      console.log(error);
      throw new AppError("SEND_MESSAGE_INTERRUPTED");
    }


    //Изменение времени последнего сообщения, отправка события о новом сообщении
    const newResponseMessageEvent = new ChatUpdatedEvent({
      id: chat.id,
      newMessage: this.messageMapper.toDto({
        message: responseMessage,
        chat
      }),
      isPending: chat.isPending,
      lastMessageAt: responseMessage.createdAt.toISOString()
    });

    await this.wsGateway.sendEvent('chatUpdated', newResponseMessageEvent, userId);


    //Обработка потокового ответа от агента, отправка событий об обновлении сообщения
    for await (const [type, chunk] of response) {
      if (type === "custom") {
        if (chunk.type === "result") {
          const data = chunk.data;

          const messageUpdateEvent = new MessageUpdatedEvent({
            id: responseMessage.id,
            chatId: chat.id,
            text: data.text,
            updateText: data.updateText
          });

          await this.wsGateway.sendEvent('messageUpdated', messageUpdateEvent, userId);
        }
      }

      if (type === "updates") {

        if (chunk.resultNode) {
          const text: string = chunk.resultNode.result as string;

          responseMessage.text = text;

          try {
            responseMessage =  await this.messageRepository.save(responseMessage);
          } catch (error) {
            console.log(error);
            throw new AppError("SEND_MESSAGE_INTERRUPTED");
          }

          const messageUpdateEvent = new MessageUpdatedEvent({
            id: responseMessage.id,
            chatId: chat.id,
            text: responseMessage.text
          });
          
          await this.wsGateway.sendEvent('messageUpdated',messageUpdateEvent,userId);
        }

        if (chunk.documentsNode) {
          const documentsNeo4jIds: number[] = chunk.documentsNode.documents as number[];

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
          try {
            responseMessage = await this.messageRepository.save(responseMessage);
          } catch(error) {
            console.log(e);
            throw new AppError("SEND_MESSAGE_INTERRUPTED");
          }
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
    try {
      chat = await this.chatRepository.save(chat);
    } catch (error) {
      console.log(error);
      throw new AppError("SEND_MESSAGE_INTERRUPTED");
    }
    const pendingStopEvent = new ChatUpdatedEvent({
      id: chat.id,
      isPending: chat.isPending
    });
    this.wsGateway.sendEvent('chatUpdated', pendingStopEvent, userId);
  }
}