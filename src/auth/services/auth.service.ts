import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "./jwt.service";
import { SignInDto } from "../dto/sign-in.dto";
import { AppError } from "src/errors/app.error";
import { PasswordService } from "./password.service";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm/repository/Repository.js";
import { RefreshToken } from "src/postgres/entities/refresh-token.entity";
import { ConfigService } from "@nestjs/config";
import { DocumentToken } from "src/postgres/entities/document-token.entity";


@Injectable()
export class AuthService {

  private readonly maxSessionsCount: number;
  private readonly refreshExpTime: number;
  private readonly documentExpTime: number;

  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(DocumentToken) private readonly documentTokenRepository: Repository<DocumentToken>,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService
  ) {
    this.maxSessionsCount = +this.configService.getOrThrow<string>('MAX_SESSIONS_COUNT');
    this.refreshExpTime = +this.configService.getOrThrow<string>('REFRESH_EXP_TIME');
    this.documentExpTime = + this.configService.getOrThrow<string>('DOCUMENT_EXP_TIME');
  }

  async signIn(args: {
    loginDto: SignInDto,
    fingerprint: string,
    userAgent: string
    ip: string
  }) {
    const { loginDto, fingerprint, userAgent, ip } = args;

    const user = await this.userRepository
      .createQueryBuilder('user')
      .select('user')
      .where('user.username = :username', { username: loginDto.username })
      .getOne();
    
    if (!user) throw new AppError("USER_NOT_FOUND");

    this.passwordService.verify(user.password, loginDto.password);

    const userRefreshTokens = await this.refreshTokenRepository
      .createQueryBuilder('refreshToken')
      .where('refreshToken.user = :userId', { userId: user.id })
      .orderBy('refreshToken.createdAt', 'DESC')
      .getMany();


    // если количество сессий больше максимального, удаляем самую старую
    if (userRefreshTokens.length >= this.maxSessionsCount && userRefreshTokens.length > 0) {
      await this.refreshTokenRepository.remove(userRefreshTokens.at(-1)!);
    }

    // создаем новый refresh токен
    let refreshToken = this.generateRefreshToken({ fingerprint, user, userAgent, ip });
    refreshToken = await this.refreshTokenRepository.save(refreshToken);

    // создаем новый document токен
    const documentToken = this.generateDocumentToken(refreshToken);
    await this.documentTokenRepository.save(documentToken);


    const access = await this.jwtService.generate({ userId: user.id });

    return { access, refresh: refreshToken.id, document: documentToken.id };
  }

  async validateDocumentToken(args: {
    documentTokenId: string,
    fingerprint: string,
    userAgent: string,
    ip: string
  }) {
    const { documentTokenId, fingerprint, userAgent, ip } = args;
    const documentToken = await this.documentTokenRepository
      .createQueryBuilder('documentToken')
      .select('documentToken')
      .leftJoinAndSelect('documentToken.refreshToken', 'refreshToken')
      .where('documentToken.id = :documentTokenId', { documentTokenId })
      .getOne();

    if (!documentToken) throw new AppError("INCORRECT_DOCUMENT_TOKEN");
    if (documentToken.expiresAt.getTime() < Date.now()) throw new AppError("DOCUMENT_TOKEN_EXPIRED");
    const refreshToken = documentToken.refreshToken;

    if (
      refreshToken.fingerprint !== fingerprint ||
      refreshToken.userAgent !== userAgent || 
      refreshToken.ip !== ip
    ){
      throw new AppError("INCORRECT_DOCUMENT_TOKEN");
    }
  }

  async refresh(args: {
    refreshId: string,
    fingerprint: string,
    userAgent: string,
    ip: string
  }) {
    const { refreshId, fingerprint, userAgent, ip } = args;
    let refresh = await this.refreshTokenRepository
      .createQueryBuilder('refreshToken')
      .select('refreshToken')
      .leftJoinAndSelect('refreshToken.user', 'user')
      .where('refreshToken.id = :refreshId', { refreshId })
      .getOne();

    if (!refresh) throw new AppError("REFRESH_TOKEN_NOT_FOUND");

    await this.refreshTokenRepository.remove(refresh!);

    if (refresh.expiresAt.getTime() < Date.now()) throw new AppError("REFRESH_TOKEN_EXPIRED");
    this.logger.log(JSON.stringify(refresh));
    this.logger.log(JSON.stringify({ fingerprint, userAgent, ip }));
    if (
      refresh.fingerprint !== fingerprint ||
      refresh.userAgent !== userAgent || 
      refresh.ip !== ip
    ){
      await this.refreshTokenRepository
        .createQueryBuilder()
        .delete()
        .from(RefreshToken)
        .where('userId = :userId', { userId: refresh.user.id })
        .execute();

      throw new AppError("INCORRECT_REFRESH_TOKEN");
    }

    // создаем новый refresh токен
    refresh = this.generateRefreshToken({ fingerprint, user: refresh.user, userAgent, ip });
    refresh = await this.refreshTokenRepository.save(refresh);
    
    // создаем новый document токен
    const documentToken = this.generateDocumentToken(refresh);
    await this.documentTokenRepository.save(documentToken);

    const access = await this.jwtService.generate({ userId: refresh.user.id });

    return { access, refresh: refresh.id, document: documentToken.id };
  }

  async signOut(refreshId: string) {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('id = :refreshId', { refreshId })
      .execute();
  }


  private generateDocumentToken(refreshToken: RefreshToken) {
    const documentToken = new DocumentToken();
    documentToken.refreshToken = refreshToken;
    documentToken.expiresAt = new Date(Date.now() + this.documentExpTime * 1000);
    return documentToken;
  }


  private generateRefreshToken(args: {
    fingerprint: string,
    user: User,
    userAgent: string,
    ip: string
  }) {
    const { fingerprint, user, userAgent, ip } = args;
    const refreshToken = new RefreshToken();
    refreshToken.user = user;
    refreshToken.fingerprint = fingerprint;
    refreshToken.userAgent = userAgent;
    refreshToken.expiresAt = new Date(Date.now() + this.refreshExpTime * 1000);
    refreshToken.ip = ip;
    return refreshToken;
  } 
}