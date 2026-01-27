import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req } from "@nestjs/common"
import { ChatService } from "./services/chat.service"
import { NewUserMessageDto } from "./dto/new-user-message.dto";


@Controller("/api/chats")
export class ChatController {

  constructor(
    @Inject()
    private readonly chatService: ChatService
  ) {}

  @Get()
  async getChats(
    @Req() req,
    @Query("limit") limit: number,
    @Query("before") before: string
  ) {
    const userId = req["userId"];
    return await this.chatService.getUserChats({ userId, before, limit });
  }

  @Get("/messages")
  async getChatMessages(
    @Req() req,
    @Query("limit") limit: number,
    @Query("before") before: string,
    @Query("chatId") chatId: string
  ) {
    const userId = req["userId"];
    return await this.chatService.getChatMessagesCursor({ userId, before, limit, chatId });
  }

  @Get("/new")
  async getNewChat(@Req() req) {
    const userId = req["userId"];
    return await this.chatService.getNewChat(userId);
  }

  @Delete(":chatId")
  async deleteChat(@Req() req, @Param("chatId") chatId: string) {
    const userId = req["userId"];
    return await this.chatService.deleteChat(chatId, userId);
  }

  @Post("/messages") 
  async sendMessage(
    @Req() req, 
    @Body() body: NewUserMessageDto
  ) {
    const userId = req["userId"];
    await this.chatService.sendMessage({
      userId,
      newUserMessageDto: body
    });
  }
  
}