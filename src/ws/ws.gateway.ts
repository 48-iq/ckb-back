import { Logger, UseGuards } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { EventType } from "./event-type.type";
import { JwtService } from "src/auth/services/jwt.service";
import { JwtDto } from "src/auth/dto/jwt.dto";
import { AppError } from "src/shared/errors/app.error";

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

  @SubscribeMessage("sign-in")
  async signIn(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { access: string}
  ) {

     try {
      const access = body.access;
      if (!access) throw new AppError("INCORRECT_JWT");
      if (!(typeof access === "string")) throw new AppError("INCORRECT_JWT");
      const { userId } = await this.jwtService.verify({
        type: "access",
        token: access
      });
      if (!userId) throw new AppError("INCORRECT_JWT");
      client.data["userId"] = userId;
      client.join(userId);
      this.logger.log(`ws client logged in: ${userId}`);
    } catch(e) {
      this.logger.log("client connection error", e.message);
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