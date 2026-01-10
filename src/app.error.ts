import { HttpStatus } from "@nestjs/common";


export interface AppErrorDescriptor {
  httpCode: number
  message: string
}


export class AppError extends Error implements AppErrorDescriptor {

  httpCode: number

  constructor(reason: AppErrorType) {
    const appErrorData = AppErrors[reason]
    super(appErrorData.message);
    this.httpCode = appErrorData.httpCode
  }
}


export const AppErrors = {
  USER_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, message: 'User not found'},
  INCORRECT_PASSWORD: {httpCode: HttpStatus.UNAUTHORIZED, message: 'Incorrect password'},
  INCORRECT_JWT: {httpCode: HttpStatus.UNAUTHORIZED, message: 'Incorrect jwt'},
  EMPTY_ATHORIZATION_HEADER: {httpCode: HttpStatus.UNAUTHORIZED, message: 'Empty authorization header'},
  PERMISSION_DENIED: {httpCode: HttpStatus.FORBIDDEN, message: 'Permission denied'},
  INCORRECT_DATA: {httpCode: HttpStatus.BAD_REQUEST, message: 'Incorrect data'},
} as const satisfies Record<string, AppErrorDescriptor>


export type AppErrorType = keyof typeof AppErrors

