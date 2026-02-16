import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "./services/jwt.service";
import { Request } from "express";
import { AppError } from "src/shared/errors/app.error";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_DECORATOR_KEY } from "./decorators/public.decorator";
import { AuthService } from "./services/auth.service";

@Injectable()
export class AuthGuard implements CanActivate {

  private readonly logger = new Logger(AuthGuard.name);
  
  constructor(
    private jwtService: JwtService, 
    private reflector: Reflector,
    private authService: AuthService
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_DECORATOR_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new AppError("EMPTY_AUTHORIZATION_HEADER");

    try {
      const { userId } = await this.jwtService.verify(token);
      request['userId'] = userId;
      return true;  
    } catch (e) {
      throw new AppError("INCORRECT_JWT");
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractDocumentFromCookie(request: Request): string|undefined {
    const document = request.signedCookies["document"];
    return document;
  }  
}