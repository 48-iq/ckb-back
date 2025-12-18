import { Body, Controller, Delete, Get, Inject, Post, Query } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { CreateChatDto } from "./dto/create-chat.dto";


@Controller("api/chats")
export class ChatController {

  constructor(
    @Inject()
    private readonly chatService: ChatService
  ) {}

  @Get()
  async allChatsOfUser(@Query('userId') userId: string) {
    return await this.chatService.getChats(userId)
  }

  @Post()
  async createChat(@Body() createChatDto: CreateChatDto) {
    return await this.chatService.createChat(createChatDto)
  }

  @Delete()
  async deleteChat(@Query('id') id: string) {
    return await this.chatService.deleteChat(id)
  }

}