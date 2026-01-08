import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtService } from "./jwt.service";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";


@Module({
  providers: [
    AuthService, 
    JwtService, 
    { provide: 'AUTH_GUARD', useClass: AuthGuard }
  ],
  controllers: [AuthController],
  
})
export class AuthModule {}