import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "./jwt.service";
import { Request } from "express";
import { AppError } from "src/app.error";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";





@Injectable()
export class AuthGuard implements CanActivate {
  
  constructor(private jwtService: JwtService, private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new AppError("EMPTY_AUTHORIZATION_HEADER");
    const userId = await this.jwtService.verifyAndRetrieveUserId(token);
    request['userId'] = userId;
    return true;  
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer') return ;
    return type === 'Bearer' ? token : undefined;
  }
  
}