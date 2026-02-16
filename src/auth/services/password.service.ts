import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { AppError } from "src/shared/errors/app.error";

@Injectable()
export class PasswordService {

  verify(userPassword: string, enteredPassword: string) {
    const result = bcrypt.compareSync(enteredPassword, userPassword);
    if (!result) throw new AppError("INCORRECT_PASSWORD");
  }

  encode(password: string) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
}