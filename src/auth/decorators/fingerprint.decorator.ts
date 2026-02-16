import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { Request } from 'express';

const logger = new Logger("FingerprintDecorator");

export const Fingerprint = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request = ctx.switchToHttp().getRequest();

    const headers = req.headers;

    const fingerprintHeaders = {
      acceptLanguage: headers['accept-language']??"default",
      acceptEncoding: headers['accept-encoding']??"default",
      connection: headers['connection']??"default",
      secChUa: (headers["sec-ch-ua"]??"default").toString(),
      secChUaMobile: (headers["sec-ch-ua-mobile"]??"default").toString(),
      secChUaPlatform: (headers["sec-ch-ua-platform"]??"default").toString(),
    };

    logger.debug(JSON.stringify(fingerprintHeaders));
    
    const fingerprint = generateFingerprint(fingerprintHeaders);
    
    return fingerprint;
  }
);

const textEncoder = new TextEncoder();

async function generateFingerprint(headers: Record<string, string>) {
  let bufferString = '';
  for (const [key, value] of Object.entries(headers)) {
    bufferString += `${key}:${value}/$/_$_/$`; 
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', textEncoder.encode(bufferString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}