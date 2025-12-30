import { Inject, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Chat } from "src/postgres/entities/chat.entity"
import { User } from "src/postgres/entities/user.entity"
import { Repository } from "typeorm"
import { ChatMapper } from "./chat.mapper"

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

  // возвращает новый чат, связанный с пользователем, создает если такого нет
  async newChat(userId: string) {
    const user = await this.userRepository.findOneByOrFail({ id: userId })
    let chat = await this.chatRepository.findOne({
      where: {
        user: {
          id: user.id
        },
        isNew: true
      }
    })
    if (chat === null) {
      chat = new Chat()
      chat.user = user
      chat.title = "Новый чат"
      chat.isNew = true
      chat = await this.chatRepository.save(chat) 
    }
    return this.chatMapper.toDto(chat)
  }

  async getUserChats(userId: string) {
    const user = await this.userRepository.findOneByOrFail({ id: userId })
    const chats = await this.chatRepository.find({
      where: {
        user: {
          id: user.id
        },
        isNew: false
      }
    })
    return chats.map(chat => this.chatMapper.toDto(chat))
  }

  async 

}