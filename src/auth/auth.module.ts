import { Module } from "@nestjs/common";
import { AuthService } from "./services/auth.service";
import { JwtService } from "./services/jwt.service";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { UserService } from "./services/user.service";
import { User } from "src/postgres/entities/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";


@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    AuthService, 
    JwtService, 
    UserService,
    { provide: 'AUTH_GUARD', useClass: AuthGuard }
  ],
  exports: [
    JwtService
  ],
  controllers: [AuthController],
  
})
export class AuthModule {}