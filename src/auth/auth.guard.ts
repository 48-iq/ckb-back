import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "./services/jwt.service";
import { Request } from "express";
import { AppError } from "src/shared/errors/app.error";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {

  private readonly logger = new Logger(AuthGuard.name);
  
  constructor(private jwtService: JwtService, private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new AppError("EMPTY_AUTHORIZATION_HEADER");
    try {
      const userId = await this.jwtService.verifyAndRetrieveUserId(token);
      
      request['userId'] = userId;
      this.logger.log(`userId: ${userId}`);
      return true;  
    } catch (e) {
      throw new AppError("INCORRECT_JWT");
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer') return ;
    return type === 'Bearer' ? token : undefined;
  }
  
}