import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "./jwt.service";
import { UserService } from "./user.service";
import { LoginDto } from "./dto/login.dto";
import { JwtDto } from "./dto/jwt.dto";
import bcrypt from "bcryptjs";
import { AppError } from "src/app.error";


@Injectable()
export class AuthService {

  constructor(
    @Inject() private readonly jwtService: JwtService,
    @Inject() private readonly userService: UserService,
  ) {}

  async login(loginDto: LoginDto): Promise<JwtDto> {
    const user = await this.userService.findOneByUsername(loginDto.username);
    this._verifyPassword(user.password, loginDto.password);
    const token = await this.jwtService.generateTokenForUser(user.id);
    return { jwt: token };
  }

  _verifyPassword(userPassword: string, enteredPassword: string) {
    const result = bcrypt.compareSync(enteredPassword, userPassword);
    if (!result) throw new AppError("INCORRECT_PASSWORD");
  }

  encodePassword(password: string) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
}