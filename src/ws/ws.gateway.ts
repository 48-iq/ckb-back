import { UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "./ws-jwt.guard";
@WebSocketGateway()
@UseGuards(WsJwtGuard)
export class WsGateway implements OnGatewayConnection {


  handleConnection(client: Socket) {
    const userId = client.data.userId;
    client.join(`user:${userId}`);
    console.log(`WS connected userId=${userId}`);
  }

  @WebSocketServer()
  server: Server;

  sendEvent(event: string, payload: any, userId: string) {
    this.server.to(userId).emit(event, payload);
  }
  

}