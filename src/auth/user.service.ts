import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError, AppErrors } from "src/app.error";
import { User } from "src/postgres/entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>
  ) {}

  async findOneByUsername(username: string) {
    const user = await this.userRepository.findOneBy({ username });
    if (!user) throw new AppError("USER_NOT_FOUND");
    return user;
  }
}