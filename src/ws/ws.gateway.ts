import { UseGuards } from "@nestjs/common";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "./ws-jwt.guard";
import { EventType } from "./event-type.type";
@WebSocketGateway()
@UseGuards(WsJwtGuard)
export class WsGateway implements OnGatewayConnection {


  handleConnection(client: Socket) {
    const userId: string = client.data["userId"];
    client.join(userId);
    console.log(`WS connected userId=${userId}`);
  }

  @WebSocketServer()
  server: Server;

  async sendEvent(event: EventType, payload: any, userId: string) {
    await this.server.to(userId).emit(event, payload);
  }
  

}