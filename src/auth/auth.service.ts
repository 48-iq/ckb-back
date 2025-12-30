import { Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import jwt from "jsonwebtoken"
@Injectable()
export class AuthService {

  private readonly secret
  constructor(
    @Inject() configService: ConfigService 
  ) {
    this.secret = configService.get<string>('JWT_SECRET')
  }

  generateToken(metadata: Map<string, string>) {
    const metadataObject = Object.fromEntries(metadata)
    const token = jwt.sign(
      metadataObject,
      this.secret,
      { algorithm: "HS256" }
    )
  }
  
}