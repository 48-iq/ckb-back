import { Logger, UseGuards } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { EventType } from "./event-type.type";
import { JwtService } from "src/auth/services/jwt.service";

@WebSocketGateway()
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  
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

  async handleConnection(client: Socket) {
    try {
      const auth = 
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization;

      if (!auth) throw new Error("empty token");
      if (!(typeof auth === "string")) throw new Error("invalid token");
      const token = auth.split(' ').at(1);
      if (!token) throw new Error("empty token");

      const userId = await this.jwtService.verifyAndRetrieveUserId(token);
      if (!userId) throw new Error("invalid token");
      client.data["userId"] = userId;
      client.join(userId);
      this.logger.log(`client connected: ${userId}`);
    } catch(e) {
      this.logger.log("client connection error", e.message);
      client.disconnect();
    }

  }

  @WebSocketServer() server: Server;

  async sendEvent(event: EventType, payload: any, userId: string) {
    await this.server.to(userId).emit(event, payload);
  }
  

}