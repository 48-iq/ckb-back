import { ConfigService } from "@nestjs/config";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
@WebSocketGateway()
export class WsGateway {

  @WebSocketServer()
  server: Server;

  sendEvent(event: any, userId: string) {
    this.server.
  }
  

}