import { HttpStatus } from "@nestjs/common";


export interface AppErrorDescriptor {
  httpCode: number;
  errorType: string;
}


export class AppError extends Error implements AppErrorDescriptor {

  httpCode: number;

  errorType: AppErrorType;

  causeError?: Error;

  constructor(reason: AppErrorType, args?: { error?: Error, message?: string }) {
    const appErrorData = AppErrors[reason];
    super(args?.message || `${appErrorData.errorType}: Сообщение об ошибке не было указано`);
    this.httpCode = appErrorData.httpCode;
    this.causeError = args?.error;
    this.errorType = reason;
  }
}


export const AppErrors = {

  //user
  USER_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, errorType: 'USER_NOT_FOUND'},
  
  //refresh token
  REFRESH_TOKEN_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, errorType: 'REFRESH_TOKEN_NOT_FOUND'},
  INCORRECT_REFRESH_TOKEN: {httpCode: HttpStatus.UNAUTHORIZED, errorType: 'INCORRECT_REFRESH_TOKEN'},
  REFRESH_TOKEN_EXPIRED: {httpCode: HttpStatus.UNAUTHORIZED, errorType: 'REFRESH_TOKEN_EXPIRED'},

  //sign-in
  INCORRECT_PASSWORD: {httpCode: HttpStatus.UNAUTHORIZED, errorType: 'INCORRECT_PASSWORD'},

  //authentication
  INCORRECT_JWT: {httpCode: HttpStatus.UNAUTHORIZED, errorType: 'INCORRECT_JWT'},
  EMPTY_AUTHORIZATION_HEADER: {httpCode: HttpStatus.UNAUTHORIZED, errorType: 'EMPTY_AUTHORIZATION_HEADER'},

  //authorization
  PERMISSION_DENIED: {httpCode: HttpStatus.FORBIDDEN, errorType: 'PERMISSION_DENIED'},
  
  //validation
  INCORRECT_DATA: {httpCode: HttpStatus.BAD_REQUEST, errorType: 'INCORRECT_DATA'},
  
  //file
  SAVE_FILE_ERROR: {httpCode: HttpStatus.INTERNAL_SERVER_ERROR, errorType: 'SAVE_FILE_ERROR'},
  GET_FILE_ERROR: {httpCode: HttpStatus.INTERNAL_SERVER_ERROR, errorType: 'GET_FILE_ERROR'},
  FILE_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, errorType: 'FILE_NOT_FOUND'},
  
  //chat
  CHAT_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, errorType: 'CHAT_NOT_FOUND'},
  CHAT_PENDING: {httpCode: HttpStatus.CONFLICT, errorType: 'CHAT_PENDING'},
  SEND_MESSAGE_INTERRUPTED: {httpCode: HttpStatus.LOCKED, errorType: 'SEND_MESSAGE_INTERRUPTED'},

  //document
  DOCUMENT_PARSE_ERROR: {httpCode: HttpStatus.INTERNAL_SERVER_ERROR, errorType: 'DOCUMENT_PARSE_ERROR'},
  DOCUMENT_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, errorType: 'DOCUMENT_NOT_FOUND'},
  DOCUMENT_ALREADY_EXISTS: {httpCode: HttpStatus.CONFLICT, errorType: 'DOCUMENT_ALREADY_EXISTS'},

  //document token
  INCORRECT_DOCUMENT_TOKEN: {httpCode: HttpStatus.UNAUTHORIZED, errorType: 'INCORRECT_DOCUMENT_TOKEN'},
  DOCUMENT_TOKEN_EXPIRED: {httpCode: HttpStatus.UNAUTHORIZED, errorType: 'DOCUMENT_TOKEN_EXPIRED'},
  DOCUMENT_TOKEN_NOT_FOUND: {httpCode: HttpStatus.NOT_FOUND, errorType: 'DOCUMENT_TOKEN_NOT_FOUND'},
  INCORRECT_DOCUMENT_FORMAT: {httpCode: HttpStatus.BAD_REQUEST, errorType: 'INCORRECT_DOCUMENT_FORMAT'},
} as const satisfies Record<string, AppErrorDescriptor>


export type AppErrorType = keyof typeof AppErrors;

