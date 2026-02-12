import { Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import jose from "jose"

export type TokenType = "access" | "refresh" | "document";

@Injectable()
export class JwtService {

  private readonly secrets: Record<string, Uint8Array<ArrayBuffer>>;

  private readonly issuer: string;
  
  private readonly audience: string;

  private readonly algorithm: string;

  private readonly expirationTimes: Record<string, number>;

  constructor( @Inject() configService: ConfigService ) {
    const accessSecret = new TextEncoder().encode(configService.get<string>('JWT_SECRET'));
    const refreshSecret = new TextEncoder().encode(configService.get<string>('JWT_REFRESH_SECRET'));
    const documentSecret = new TextEncoder().encode(configService.get<string>('JWT_DOCUMENT_KEY_SECRET'));
    this.secrets = { 
      access: accessSecret, 
      refresh: refreshSecret, 
      document: documentSecret 
    };
    this.issuer = configService.get<string>('JWT_ISSUER') || 'ckb-back';
    this.audience = configService.get<string>('JWT_AUDIENCE') || 'ckb-back';
    this.algorithm = configService.get<string>('JWT_ALGORITHM') || 'HS256';
    const accessExpTime = +configService.getOrThrow<string>('JWT_EXPIRATION_TIME');
    const refreshExpTime = +configService.getOrThrow<string>('JWT_REFRESH_EXPIRATION_TIME');
    const documentKeyExpTime = +configService.getOrThrow<string>('JWT_DOCUMENT_KEY_EXPIRATION_TIME');
    this.expirationTimes = {
      access: accessExpTime,
      refresh: refreshExpTime,
      document: documentKeyExpTime
    }
  }

  private async _generate(args: {
    claims: Record<string, any>,
    expirationTime: number,
    signKey: Uint8Array<ArrayBuffer>
  }) {
    const { claims, expirationTime, signKey } = args;
    const jwt = await new jose.SignJWT(claims)
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setAudience(this.audience)
      .setIssuer(this.issuer)
      .setExpirationTime(`${expirationTime??300} s`)
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
    const expirationTime = this.expirationTimes[args.type];
    const signKey = this.secrets[args.type];
    return await this._generate({
      claims: args.payload,
      expirationTime,
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