import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm";
import { AuthService } from "./auth.service";


@Injectable()
export class UsersInitService implements OnApplicationBootstrap{

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {}

  async onApplicationBootstrap() {
    const usersString = this.configService.getOrThrow<string>('APP_USERS');
    const splittedUsersStrings = usersString.split('|');
    if (splittedUsersStrings.length === 0) throw new Error('APP_USERS is empty');
    for (const userString of splittedUsersStrings) {
      const [username, password] = userString.split(':');
      if (!username || !password) throw new Error('APP_USERS is invalid');
      const user = await this.userRepository.findOneBy({ username });
      if (user) continue;
      const newUser = new User();
      newUser.username = username;
      newUser.password = this.authService.encodePassword(password);
      await this.userRepository.save(newUser);
    }
  }

  
}