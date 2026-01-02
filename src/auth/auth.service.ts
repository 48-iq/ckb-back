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

  _generateToken(metadata: Map<string, string>) {
    const metadataObject = Object.fromEntries(metadata)
    return jwt.sign(
      metadataObject,
      this.secret,
      { algorithm: "HS256" }
    )
  }

  _validateToken(token: string, requiredData: string[]) {
    jwt.verify(token, this.secret, { algorithms: ["HS256"] }, (err, payload) => {
      
    })
  
    
  }

  generateTokenForUser(userId: string) {
    const metadata = new Map<string, string>([
      ["userId", userId]
    ])
    return this._generateToken(metadata)
  }

  validateUserToken() {
    const m
  }


  
}