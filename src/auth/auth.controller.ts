import { Body, Controller, Post } from "@nestjs/common";
import { SignInDto } from "./dto/sign-in.dto";
import { AuthService } from "./services/auth.service";
import { JwtDto } from "./dto/jwt.dto";
import { Public } from "./public.decorator";
import { RefreshDto } from "./dto/refresh.dto";

@Controller("/api/auth")
export class AuthController {

  constructor(
    private readonly authService: AuthService
  ) {}

  @Public()
  @Post("/sign-in")
  async login( @Body() loginDto: SignInDto): Promise<JwtDto> {
    return await this.authService.login(loginDto);
  }

  @Public()
  @Post("/refresh")
  async refresh(
    @Body() refreshDto: RefreshDto 
  ) {
    return await this.authService.refresh(refreshDto.refresh);
  }
  
}