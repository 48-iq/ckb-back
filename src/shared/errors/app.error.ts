import { HttpStatus } from "@nestjs/common";


export interface AppErrorDescriptor {
  httpCode: number;
  message: string;
}


export class AppError extends Error implements AppErrorDescriptor {

  httpCode: number;

  errorType: AppErrorType;

  causeError?: Error;

  constructor(reason: AppErrorType, args?: { e?: Error, message?: string }) {
    const appErrorData = AppErrors[reason];
    super(args?.message || appErrorData.message);
    this.httpCode = appErrorData.httpCode;
    this.causeError = args?.e;
    this.errorType = reason;
  }
}


export const AppErrors = {
  CHAT_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, message: 'Chat not found'},
  USER_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, message: 'User not found'},
  INCORRECT_PASSWORD: {httpCode: HttpStatus.UNAUTHORIZED, message: 'Incorrect password'},
  INCORRECT_JWT: {httpCode: HttpStatus.UNAUTHORIZED, message: 'Incorrect jwt'},
  EMPTY_AUTHORIZATION_HEADER: {httpCode: HttpStatus.UNAUTHORIZED, message: 'Empty authorization header'},
  PERMISSION_DENIED: {httpCode: HttpStatus.FORBIDDEN, message: 'Permission denied'},
  INCORRECT_DATA: {httpCode: HttpStatus.BAD_REQUEST, message: 'Incorrect data'},
  SAVE_FILE_ERROR: {httpCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Save file error'},
  GET_FILE_ERROR: {httpCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Get file error'},
  FILE_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, message: 'File not found'},
  CHAT_PENDING: {httpCode: HttpStatus.CONFLICT, message: 'Chat pending'},
  SEND_MESSAGE_INTERRUPTED: {httpCode: HttpStatus.LOCKED, message: 'Send message interrupted'},
} as const satisfies Record<string, AppErrorDescriptor>


export type AppErrorType = keyof typeof AppErrors;

