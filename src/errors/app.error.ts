import { HttpStatus } from "@nestjs/common";

export interface AppErrorDescriptor {
  httpDescription?: {
    httpCode: number;
    errorType: string;
  };
}

export class AppError extends Error implements AppErrorDescriptor {

  httpDescription?: {
    httpCode: number;
    errorType: string;
  };

  errorType: AppErrorType;

  causeError?: Error;

  constructor(errorType: AppErrorType, args?: { error?: Error, message?: string }) {
    const appErrorData = AppErrors[errorType];
    super(`${errorType}${args?.message ? `: ${args.message}` : ''}`);
    this.httpDescription = appErrorData.httpDescription;
    this.causeError = args?.error;
    this.errorType = errorType;
  }

}


export const AppErrors = {

  //user
  USER_NOT_FOUND: { httpDescription: {
    httpCode: HttpStatus.NOT_FOUND, 
    errorType: 'USER_NOT_FOUND'
  }},
  
  //refresh token
  REFRESH_TOKEN_NOT_FOUND: { httpDescription: { 
    httpCode: HttpStatus.NOT_FOUND, 
    errorType: 'REFRESH_TOKEN_NOT_FOUND' 
  }},
  INCORRECT_REFRESH_TOKEN: { httpDescription: { 
    httpCode: HttpStatus.UNAUTHORIZED, 
    errorType: 'INCORRECT_REFRESH_TOKEN' 
  }},
  REFRESH_TOKEN_EXPIRED: { httpDescription: { 
    httpCode: HttpStatus.UNAUTHORIZED, 
    errorType: 'REFRESH_TOKEN_EXPIRED'
  }},

  //sign-in
  INCORRECT_PASSWORD: { httpDescription: { 
    httpCode: HttpStatus.UNAUTHORIZED, 
    errorType: 'INCORRECT_PASSWORD'
  }},

  //authentication
  INCORRECT_JWT: { httpDescription: { 
    httpCode: HttpStatus.UNAUTHORIZED, 
    errorType: 'INCORRECT_JWT'
  }},
  EMPTY_AUTHORIZATION_HEADER: { httpDescription: { 
    httpCode: HttpStatus.UNAUTHORIZED, 
    errorType: 'EMPTY_AUTHORIZATION_HEADER'
  }},

  //authorization
  PERMISSION_DENIED: { httpDescription: { 
    httpCode: HttpStatus.FORBIDDEN, 
    errorType: 'PERMISSION_DENIED'
  }},
  
  //validation
  INCORRECT_DATA: { httpDescription: {
    httpCode: HttpStatus.BAD_REQUEST, 
    errorType: 'INCORRECT_DATA'
  }},
  
  //file
  SAVE_FILE_ERROR: { httpDescription: { 
    httpCode: HttpStatus.INTERNAL_SERVER_ERROR, 
    errorType: 'SAVE_FILE_ERROR'
  }},
  GET_FILE_ERROR: { httpDescription: {
    httpCode: HttpStatus.INTERNAL_SERVER_ERROR, 
    errorType: 'GET_FILE_ERROR'
  }},
  FILE_NOT_FOUND: { httpDescription: { 
    httpCode: HttpStatus.NOT_FOUND, 
    errorType: 'FILE_NOT_FOUND'
  }},
  INCORRECT_FILETYPE: { httpDescription: {
    httpCode: HttpStatus.BAD_REQUEST, 
    errorType: 'INCORRECT_FILETYPE'
  }},

  //chat
  CHAT_NOT_FOUND: { httpDescription: {
    httpCode: HttpStatus.NOT_FOUND, 
    errorType: 'CHAT_NOT_FOUND'
  }},
  CHAT_PENDING: { httpDescription: { 
    httpCode: HttpStatus.CONFLICT, 
    errorType: 'CHAT_PENDING'
  }},
  SEND_MESSAGE_INTERRUPTED: { httpDescription: { 
    httpCode: HttpStatus.LOCKED, 
    errorType: 'SEND_MESSAGE_INTERRUPTED'
  }},

  //document
  DOCUMENT_PARSE_ERROR: { httpDescription: { 
    httpCode: HttpStatus.INTERNAL_SERVER_ERROR, 
    errorType: 'DOCUMENT_PARSE_ERROR'
  }},
  DOCUMENT_NOT_FOUND: { httpDescription: { 
    httpCode: HttpStatus.NOT_FOUND, 
    errorType: 'DOCUMENT_NOT_FOUND'
  }},
  DOCUMENT_ALREADY_EXISTS: { httpDescription: { 
    httpCode: HttpStatus.CONFLICT, 
    errorType: 'DOCUMENT_ALREADY_EXISTS'
  }},

  //document token
  INCORRECT_DOCUMENT_TOKEN: { httpDescription: { 
    httpCode: HttpStatus.UNAUTHORIZED, 
    errorType: 'INCORRECT_DOCUMENT_TOKEN'
  }},
  DOCUMENT_TOKEN_EXPIRED: { httpDescription: { 
    httpCode: HttpStatus.UNAUTHORIZED, 
    errorType: 'DOCUMENT_TOKEN_EXPIRED'
  }},
  DOCUMENT_TOKEN_NOT_FOUND: { httpDescription: { 
    httpCode: HttpStatus.NOT_FOUND, 
    errorType: 'DOCUMENT_TOKEN_NOT_FOUND'
  }},
  INCORRECT_DOCUMENT_FORMAT: { httpDescription: { 
    httpCode: HttpStatus.BAD_REQUEST, 
    errorType: 'INCORRECT_DOCUMENT_FORMAT'
  }},

  //function arguments
  INCORRECT_FUNCTION_ARGUMENTS: { httpDescription: undefined},

  //fact extraction
  FACT_EXTRACTION_ERROR: { httpDescription: undefined },

  //name generation
  NAME_GENERATION_ERROR: { httpDescription: undefined },
} as const satisfies Record<string, AppErrorDescriptor>


export type AppErrorType = keyof typeof AppErrors;

