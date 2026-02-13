import { Body, Controller, Post, Res } from "@nestjs/common";
import { SignInDto } from "./dto/sign-in.dto";
import { AuthService } from "./services/auth.service";
import { JwtDto } from "./dto/jwt.dto";
import { Public } from "./public.decorator";
import { RefreshDto } from "./dto/refresh.dto";
import { type Response } from "express";
import { ConfigService } from "@nestjs/config";

@Controller("/api/auth")
export class AuthController {

  private readonly domain;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    this.domain = this.configService.getOrThrow<string>('APP_HOST');
  }

  @Public()
  @Post("/sign-in")
  async signIn(
    @Body() loginDto: SignInDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const access = await this.authService.signIn(loginDto);
    res.cookie("access", access, { httpOnly: true });
    res.cookie("access", access, { secure: false, signed: true});
  }

  @Post("/sign-out")
  async signOut(
    @Res({ passthrough: true }) res: Response
  ) {
    res.clearCookie("access");
  }

  
}