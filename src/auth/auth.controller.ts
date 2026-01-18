import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { AuthService } from "./auth.service";
import { JwtDto } from "./dto/jwt.dto";
import { Public } from "./public.decorator";

@Controller("/api")
export class AuthController {

  constructor(
    private readonly authService: AuthService
  ) {}

  @Public()
  @Post("/login")
  async login( @Body() loginDto: LoginDto): Promise<JwtDto> {
    return await this.authService.login(loginDto);
  }
  
}