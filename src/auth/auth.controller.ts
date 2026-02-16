import { Body, Controller, Logger, Post, Req, Res } from "@nestjs/common";
import { SignInDto } from "./dto/sign-in.dto";
import { AuthService } from "./services/auth.service";
import { Public } from "./decorators/public.decorator";
import { type Request, type Response } from "express";
import { ConfigService } from "@nestjs/config";
import { Fingerprint } from "./decorators/fingerprint.decorator";
import { JwtDto } from "./dto/jwt.dto";

@Controller("/api/auth")
export class AuthController {

  private readonly domain: string;
  private readonly useSsl: boolean;

  private readonly refreshMaxAge: number;
  private readonly documentMaxAge: number;

  private readonly logger = new Logger(AuthController.name);
  
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.domain = this.configService.getOrThrow<string>('APP_HOST');
    this.useSsl = this.configService.getOrThrow<string>('USE_SSL') === "true";

    let refreshMaxAge = (+this.configService.getOrThrow<number>('REFRESH_EXP_TIME') - 60) * 1000;
    if (refreshMaxAge < 0) refreshMaxAge = 0;
    this.refreshMaxAge = refreshMaxAge;

    let documentMaxAge = (+this.configService.getOrThrow<number>('DOCUMENT_EXP_TIME') - 60) * 1000;
    if (documentMaxAge < 0) documentMaxAge = 0;
    this.documentMaxAge = documentMaxAge;
  }


  @Public()
  @Post("/sign-in")
  async signIn(
    @Body() loginDto: SignInDto,
    @Fingerprint() fingerprint: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const userAgent = req.headers["user-agent"]??"default";
    const ip = req.ip??"default";

    const { access, refresh, document } = await this.authService.signIn({ loginDto, fingerprint, userAgent, ip });

    res.cookie( "refresh", refresh, { 
      httpOnly: true, 
      domain: this.domain, 
      sameSite: "strict", 
      secure: this.useSsl,
      signed: true,
      path: "/api/auth",
      maxAge: this.refreshMaxAge
    });

    res.cookie("isAuth", "true", {
      maxAge: this.refreshMaxAge
    });

    res.cookie( "document", document, {
      httpOnly: true, 
      domain: this.domain, 
      sameSite: "strict", 
      secure: this.useSsl,
      signed: true,
      path: "/api/documents",
      maxAge: this.documentMaxAge
    });

    return new JwtDto(access);
  }

  @Post("/sign-out")
  async signOut(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request
  ) {
    const refreshId = req.signedCookies["refresh"];
    if (refreshId) {
      await this.authService.signOut(refreshId);
    }
    res.clearCookie("refresh");
    res.clearCookie("isAuth");
    res.clearCookie("document");
  }
  
  @Public()
  @Post("/refresh") 
  async refresh(
    @Fingerprint() fingerprint: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<JwtDto> {

    const userAgent = req.headers["user-agent"]??"default";
    const ip = req.ip??"default";
    const refreshId = req.signedCookies["refresh"];

    const { refresh, access, document } = await this.authService.refresh({
      refreshId, 
      fingerprint, 
      userAgent, 
      ip 
    });

    res.cookie( "refresh", refresh, { 
      httpOnly: true, 
      domain: this.domain, 
      sameSite: "strict", 
      secure: this.useSsl,
      signed: true,
      path: "/api/auth",
      maxAge: this.refreshMaxAge
    });

    res.cookie("isAuth", "true", {
      maxAge: this.refreshMaxAge
    });

    res.cookie( "document", document, {
      httpOnly: true, 
      domain: this.domain, 
      sameSite: "strict", 
      secure: this.useSsl,
      signed: true,
      path: "/api/documents",
      maxAge: this.documentMaxAge
    });

    return new JwtDto(access);
  }



  
}