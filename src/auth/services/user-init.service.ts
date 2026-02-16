import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm";
import { PasswordService } from "./password.service";

/*
  Инициализирует пользователей при старте приложения
*/
@Injectable()
export class UsersInitService implements OnApplicationBootstrap{

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService
  ) {}

  async onApplicationBootstrap() {
    const usersString = this.configService.getOrThrow<string>('APP_USERS');

    const splittedUsersStrings = usersString.split('|');

    if (splittedUsersStrings.length === 0) throw new Error('APP_USERS is empty');

    for (const userString of splittedUsersStrings) {
      const [username, password] = userString.split(':');

      if (!username || !password) throw new Error('APP_USERS is invalid');

      if (await this.userRepository.existsBy({ username })) continue;

      const newUser = this.generateUser({ username, password });

      await this.userRepository.save(newUser);
    }
  }

  private generateUser(args: {username: string, password: string}) {
    const { username, password } = args;

    const newUser = new User();

    newUser.username = username;
    newUser.password = this.passwordService.encode(password);

    return newUser;
  }
}