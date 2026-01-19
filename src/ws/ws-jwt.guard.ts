import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Socket } from 'socket.io';
import { AppError } from 'src/app.error';
import { JwtService } from 'src/auth/jwt.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();

    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError("EMPTY_AUTHORIZATION_HEADER");
    }

    try {
      const userId = this.jwtService.verifyAndRetrieveUserId(token);
      client.data["userId"] = userId; 
      return true;
    } catch {
      throw new AppError("INCORRECT_JWT");
    }
  }
}
