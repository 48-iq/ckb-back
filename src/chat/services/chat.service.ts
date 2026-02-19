import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat } from "src/postgres/entities/chat.entity";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm";
import { ChatMapper } from "../mappers/chat.mapper";
import { Message } from "src/postgres/entities/message.entity";
import { AppError } from "src/errors/app.error";
import { WsGateway } from "src/ws/ws.gateway";
import { MessageMapper } from "../mappers/message.mapper";
import { CursorDto } from "../../shared/dto/cursor.dto";
import { ChatDto } from "../dto/chat.dto";
import { CursorMapper } from "../../shared/mappers/cursor.mapper";
import { MessageDto } from "../dto/message.dto";
import { AgentService } from "src/agent/services/agent.service";
import { ChatDeletedEvent } from "../events/chat-deleted.event";
import { AgentProcessService } from "./agent-process.service";
import { GenerateTitleService } from "./generate-title.service";
@Injectable()
export class ChatService {

  private readonly logger = new Logger(ChatService.name);
  
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>, 
    private readonly agentService: AgentService,
    private readonly wsGateway: WsGateway,
    private readonly chatMapper: ChatMapper,
    private readonly messageMapper: MessageMapper,
    private readonly cursorMapper: CursorMapper,
    private readonly agentProcessService: AgentProcessService,
    private readonly generateTitleService: GenerateTitleService
  ) {}

  async deleteChat(chatId: string, userId: string) {
    const chat = await this.chatRepository.findOneBy({ id: chatId });
    if (chat?.user.id !== userId) throw new AppError("PERMISSION_DENIED");
    if (chat) {
      if (chat.isPending) {
        await this.agentService.stopChat(chatId);
      }
      await this.chatRepository.remove(chat);
      this.wsGateway.sendEvent('chatDeleted', new ChatDeletedEvent(chatId), userId);
    }
  }

  async getUserChatsCursor(args: {
    userId: string;
    before: string;
    limit: number;
  }): Promise<CursorDto<ChatDto>> {
    const { userId, before, limit } = args;
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
      .where('chat.userId = :userId', { userId })
      .andWhere('chat.createdAt < :before', { before: new Date(before) })
      .orderBy('"lastMessageAt"', 'DESC')
      .take(limit);

    let itemsLeft = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.userId = :userId', { userId })
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
        return this.chatMapper.toChatDto(entity);
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
      .leftJoinAndSelect('message.chat', 'chat')
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
      dataMapper: (m: Message) => this.messageMapper.toDto(m)
    });

    return messagesCursorDto;
  }

  async sendMessage(args: {
      userId: string;
      text: string;
      chatId?: string;
    }) {

    const { userId, text, chatId } = args;

    let chat: Chat|null = null;

    try {
      if (chatId) {
        
        chat = await this.chatRepository.findOneBy({ id: chatId });


        if (!chat) throw new AppError("CHAT_NOT_FOUND");
        if (chat.user.id !== userId) throw new AppError("PERMISSION_DENIED");
        if (chat.isPending) throw new AppError("CHAT_PENDING");

        chat.isPending = true;
        chat = await this.chatRepository.save(chat);
        await this.wsGateway.sendEvent('chatUpdated', this.chatMapper.toChatDto(chat), userId);

      } else {

        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) throw new AppError("USER_NOT_FOUND");

        chat = new Chat();
        chat.user = user;
        chat.title = "Новый чат";
        chat.isPending = true;
        chat = await this.chatRepository.save(chat);

        await this.wsGateway.sendEvent('chatCreated', this.chatMapper.toChatDto(chat), userId);
      }

      let userMessage = this.messageMapper.toUserMessageEntity({ chat, text });
      userMessage = await this.messageRepository.save(userMessage);
      await this.wsGateway.sendEvent(
        'messageCreated', 
        this.messageMapper.toDto(userMessage),
        userId
      );
      
      chat.lastMessageAt = userMessage.createdAt;
      this.wsGateway.sendEvent('chatUpdated', this.chatMapper.toChatDto(chat), userId);

      //получения всех сообщений в чате для передачи агенту
      const chatMessages = await this.getChatMessages(chat.id);

      
      if (chatMessages.length === 0) throw new Error("No messages in active chat");
      
      await this.agentProcessService.processMessages({ chat, messages: chatMessages, userId });
      
      this.generateTitleService.generateTitle(chatMessages).then(async (title) => {
        if (chat) {
          this.logger.log(`title generated: ${title} for chat ${chat.id}`);
          chat.title = title??chat.title;
          await this.chatRepository.save(chat);
          this.wsGateway.sendEvent('chatUpdated', this.chatMapper.toChatDto(chat), userId);
        }
      });

    } catch (error) {
      this.logger.error(error);
      if (chat) {
        chat.isPending = false;
        await this.chatRepository.save(chat);
      }
      if (error instanceof AppError) throw error;
      throw new AppError("SEND_MESSAGE_INTERRUPTED");
    } finally {
      if (chat) {
        chat.isPending = false;
        await this.chatRepository.save(chat);
        this.wsGateway.sendEvent('chatUpdated', this.chatMapper.toChatDto(chat), userId);
      }
    }
    
  }

  async getChat(args: {chatId: string, userId: string}) {
    const { chatId, userId } = args;
    const chat = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.user', 'user')
      .where('chat.id = :chatId', { chatId })
      .getOne();
    if (!chat) throw new AppError("CHAT_NOT_FOUND");
    if (chat.user.id !== userId) throw new AppError("PERMISSION_DENIED");
    return this.chatMapper.toChatDto(chat);
  }

  private async getChatMessages(chatId: string) {
    return await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.documents', 'document')
      .leftJoinAndSelect('document.contract', 'contract')
      .leftJoinAndSelect('message.chat', 'chat')
      .where('chat.id = :chatId', { chatId })
      .orderBy('message.createdAt', 'ASC')
      .getMany();
  }
}