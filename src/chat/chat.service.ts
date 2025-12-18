import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat } from "src/db/postgres/entities/chat.entity";
import { User } from "src/db/postgres/entities/user.entity";
import { DataSource, EntityNotFoundError, Repository } from "typeorm";
import { CreateChatDto } from "./dto/create-chat.dto";
import { ChatMapper } from "./chat.mapper";

@Injectable()
export class ChatService {
  
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject()
    private chatMapper: ChatMapper
  ) {}

  async createChat(chatCreateDto: CreateChatDto) {
    const user = await this.userRepository.findOneByOrFail({ id: chatCreateDto.userId })
    const chat = this.chatMapper.toEntity(chatCreateDto, user)
    const savedChat = await this.chatRepository.save(chat)
    return savedChat
  }

  async getChats(userId: string) {
    const user = await this.userRepository.findOneByOrFail({ id: userId })
    return user.chats.map(chat => this.chatMapper.toDto(chat))
  }

  async deleteChat(id: string) {
    await this.chatRepository.delete({ id })
  }

}