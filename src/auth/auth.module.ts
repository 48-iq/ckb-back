import { Module } from "@nestjs/common";
import { AuthService } from "./services/auth.service";
import { JwtService } from "./services/jwt.service";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { User } from "src/postgres/entities/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersInitService } from "./services/user-init.service";
import { PasswordService } from "./services/password.service";
import { RefreshToken } from "src/postgres/entities/refresh-token.entity";
import { DocumentToken } from "src/postgres/entities/document-token.entity";


@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken, DocumentToken])],
  providers: [
    AuthService, 
    JwtService, 
    UsersInitService,
    AuthGuard,
    PasswordService,
  ],
  exports: [
    JwtService,
    AuthService
  ],
  controllers: [AuthController],
  
})
export class AuthModule {}