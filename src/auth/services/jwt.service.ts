import { Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import jose from "jose"

@Injectable()
export class JwtService {

  private readonly secret: Uint8Array<ArrayBuffer>;

  private readonly issuer: string;
  
  private readonly audience: string;

  private readonly algorithm: string;

  private readonly expTime: number;

  constructor( @Inject() configService: ConfigService ) {
    this.secret = new TextEncoder().encode(configService.get<string>('JWT_SECRET'));
    this.issuer = configService.getOrThrow<string>('JWT_ISSUER');
    this.audience = configService.getOrThrow<string>('JWT_AUDIENCE');
    this.algorithm = configService.getOrThrow<string>('JWT_ALGORITHM');
    this.expTime = configService.getOrThrow<number>('JWT_EXP_TIME');
  }

  async generate(payload: Record<string, any>) {
     return await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setExpirationTime(`${this.expTime}s`)
      .setAudience(this.audience)
      .setIssuer(this.issuer)
      .sign(this.secret);
  }

  async verify(token: string) {
    const { payload } = await jose.jwtVerify<Record<string, any>>(
      token, 
      this.secret, 
      {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: [this.algorithm],
      }
    );
    return payload;
  }
}