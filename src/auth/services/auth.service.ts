import { Injectable } from "@nestjs/common";
import { JwtService } from "./jwt.service";
import { UserService } from "./user.service";
import { SignInDto } from "../dto/sign-in.dto";
import bcrypt from "bcryptjs";
import { AppError } from "src/shared/errors/app.error";


@Injectable()
export class AuthService {

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async signIn(loginDto: SignInDto): Promise<string> {
    const user = await this.userService.findOneByUsername(loginDto.username);

    this.verifyPassword(user.password, loginDto.password);

    const access = await this.jwtService.generate({
      type: "access",
      payload: { userId: user.id },
    });

    return access;
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