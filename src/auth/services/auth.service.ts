import { Injectable } from "@nestjs/common";
import { JwtService } from "./jwt.service";
import { UserService } from "./user.service";
import { SignInDto } from "../dto/sign-in.dto";
import { JwtDto } from "../dto/jwt.dto";
import bcrypt from "bcryptjs";
import { AppError } from "src/shared/errors/app.error";


@Injectable()
export class AuthService {

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async login(loginDto: SignInDto): Promise<JwtDto> {
    const user = await this.userService.findOneByUsername(loginDto.username);

    this.verifyPassword(user.password, loginDto.password);

    const access = await this.jwtService.generate({
      type: "access",
      payload: { userId: user.id },
    });

    const refresh = await this.jwtService.generate({
      type: "refresh",
      payload: { userId: user.id },
    });
    
    return { access, refresh };
  }

  async refresh(oldRefresh: string): Promise<JwtDto> {
    try {
      const { userId } = await this.jwtService.verify({ 
        type: "refresh",
        token: oldRefresh
      });
      const access = await this.jwtService.generate({
        type: "access",
        payload: { userId },
      });
      const refresh = await this.jwtService.generate({
        type: "refresh",
        payload: { userId },
      })
      return { access, refresh };
    } catch(e) {
      throw new AppError("INCORRECT_JWT");
    }
  }
  
  verifyPassword(userPassword: string, enteredPassword: string) {
    const result = bcrypt.compareSync(enteredPassword, userPassword);
    if (!result) throw new AppError("INCORRECT_PASSWORD");
  }

  encodePassword(password: string) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
}