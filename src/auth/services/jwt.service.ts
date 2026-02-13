import { Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import jose from "jose"

export type TokenType = "access" | "document";

@Injectable()
export class JwtService {

  private readonly secrets: Record<string, Uint8Array<ArrayBuffer>>;

  private readonly issuer: string;
  
  private readonly audience: string;

  private readonly algorithm: string;

  constructor( @Inject() configService: ConfigService ) {
    const accessSecret = new TextEncoder().encode(configService.get<string>('JWT_SECRET'));
    this.secrets = { 
      access: accessSecret, 
    };
    this.issuer = configService.get<string>('JWT_ISSUER') || 'ckb-back';
    this.audience = configService.get<string>('JWT_AUDIENCE') || 'ckb-back';
    this.algorithm = configService.get<string>('JWT_ALGORITHM') || 'HS256';
  }

  private async _generate(args: {
    claims: Record<string, any>,
    signKey: Uint8Array<ArrayBuffer>
  }) {
    const { claims, signKey } = args;
    const jwt = await new jose.SignJWT(claims)
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setAudience(this.audience)
      .setIssuer(this.issuer)
      .sign(signKey);
    return jwt;
  }

  private async _verify(args: {
    token: string,
    signKey: Uint8Array<ArrayBuffer>,
  }) {
    const { token, signKey } = args;
    const { payload } = await jose.jwtVerify<Record<string, any>>(token, signKey, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: [this.algorithm],
    });

    return payload;
  }

  async generate(args: {
    type: TokenType
    payload: Record<string, any>
  }) {
    const signKey = this.secrets[args.type];
    return await this._generate({
      claims: args.payload,
      signKey
    });
  }

  async verify(args: {
    type: TokenType,
    token: string
  }) {
    const { token, type } = args;
    const signKey = this.secrets[type];
    return await this._verify({ token, signKey });
  }
}