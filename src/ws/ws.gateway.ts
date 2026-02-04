import { Logger, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { EventType } from "./event-type.type";
import { JwtService } from "src/auth/services/jwt.service";
import { JwtDto } from "src/auth/dto/jwt.dto";

@WebSocketGateway()
export class WsGateway implements OnGatewayDisconnect {
  
  private readonly logger = new Logger(WsGateway.name);
  
  constructor(
    private readonly jwtService: JwtService
  ) {}
  handleDisconnect(client: Socket) {
    try {
      const userId = client.data["userId"];
      if (!userId) return;
      client.leave(userId);
      this.logger.log(`client disconnected: ${userId}`);
    } catch(e) {
      this.logger.log("client disconnection error", e.message);
    }
  }

  @SubscribeMessage("login")
  async login(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JwtDto
  ) {

     try {
      const jwt = body.jwt;
      if (!jwt) throw new Error("empty token");
      if (!(typeof jwt === "string")) throw new Error("invalid token");
      const token = jwt.split(' ').at(1);
      if (!token) throw new Error("empty token");

      const userId = await this.jwtService.verifyAndRetrieveUserId(token);
      if (!userId) throw new Error("invalid token");
      client.data["userId"] = userId;
      client.join(userId);
      this.logger.log(`ws client logged in: ${userId}`);
    } catch(e) {
      this.logger.log("client connection error", e.message);
      client.disconnect();
    }
  }

  @SubscribeMessage("logout")
  async logout(
    @ConnectedSocket() client: Socket
  ) {
    const userId = client.data["userId"];
    if (!userId) return;
    client.data["userId"] = undefined;
    client.leave(userId)
    this.logger.log(`client logged out: ${userId}`);
  }

  @WebSocketServer() server: Server;

  async sendEvent(event: EventType, payload: any, userId: string) {
    await this.server.to(userId).emit(event, payload);
  }
  

}