import { UseGuards } from "@nestjs/common";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "./ws-jwt.guard";
import { EventType } from "./event-type.type";
import { AuthService } from "src/auth/services/auth.service";

@WebSocketGateway()
export class WsGateway implements OnGatewayConnection {
  
  
  constructor(
    private readonly authService: AuthService
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
    } catch() {
      //TODO: доделать handleConnection, убрать jwt guard
    }

  }

  @WebSocketServer() server: Server;

  async sendEvent(event: EventType, payload: any, userId: string) {
    await this.server.to(userId).emit(event, payload);
  }
  

}