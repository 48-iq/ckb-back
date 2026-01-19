import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat } from "src/postgres/entities/chat.entity";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm";
import { ChatMapper } from "./chat.mapper";
import { Message } from "src/postgres/entities/message.entity";
import { AppError } from "src/app.error";
import { ChatPageDto } from "./dto/chat-page.dto";
import { NewUserMessageDto } from "./dto/new-user-message.dto";
import { WsGateway } from "src/ws/ws.gateway";

@Injectable()
export class ChatService {
  
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>, 
    private readonly wsGateway: WsGateway,
    private readonly chatMapper: ChatMapper
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
    userId: string,
    page: number,
    size: number
  }): Promise<ChatPageDto> {
    const { userId, page, size } = args;
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new AppError("USER_NOT_FOUND");
    }
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

    const totalPages = Math.ceil(totalItems / size);
    const chatPageDto = new ChatPageDto();
    chatPageDto.page = page;
    chatPageDto.size = size;
    chatPageDto.totalItems = totalItems;
    chatPageDto.totalPages = totalPages;
    chatPageDto.data = entities.map(chat => 
      this.chatMapper.toDto(chat, chat.lastMessageAt)
    );
    return chatPageDto;
  }


  async sendMessage(userId: string, newUserMessageDto: NewUserMessageDto) {
    const { chatId, text } = newUserMessageDto;
    const chat = await this.chatRepository.findOneBy({ id: chatId });
    if (!chat) throw new AppError("CHAT_NOT_FOUND");
    const message = new Message();
    message.chat = chat;
    message.role = "user";
    message.text = text;
    await this.messageRepository.save(message);
    await this.wsGateway.sendEvent(
      'newMessage', ,
      userId
    );
  }
}