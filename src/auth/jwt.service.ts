import { Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import jose from "jose"

type JwtPayload = {
  userId: string
}

@Injectable()
export class JwtService {

  private readonly secret: Uint8Array<ArrayBuffer>;

  private readonly issuer: string;
  
  private readonly audience: string;

  private readonly algorithm: string;

  constructor( @Inject() configService: ConfigService ) {
    this.secret = new TextEncoder().encode(configService.get<string>('JWT_SECRET'));
    this.issuer = configService.get<string>('JWT_ISSUER') || 'ckb-back';
    this.audience = configService.get<string>('JWT_AUDIENCE') || 'ckb-back';
    this.algorithm = configService.get<string>('JWT_ALGORITHM') || 'HS256';
  }

  private async generateToken(claims: JwtPayload) {
    const jwt = await new jose.SignJWT(claims)
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setAudience(this.audience)
      .setIssuer(this.issuer)
      .setExpirationTime("3d")
      .sign(this.secret);

    return jwt;
  }

  private async verifyToken(token: string) {
    const { payload } = await jose.jwtVerify<JwtPayload>(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience
    });

    return payload;
  }

  async generateTokenForUser(userId: string) {
    return await this.generateToken({ userId });
  }

  async verifyAndRetrieveUserId(jwt: string) {
    const { userId } = await this.verifyToken(jwt);
    return userId;
  }


  
}