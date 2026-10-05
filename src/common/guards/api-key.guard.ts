import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['x-api-key'];
    const providedKey = Array.isArray(header) ? undefined : header;
    const expectedKey = this.config.get<string>('ECOMMERCE_API_KEY');

    if (
      !providedKey ||
      !expectedKey ||
      !this.safeEqual(providedKey, expectedKey)
    ) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  /** Constant-time comparison to avoid leaking the key via timing. */
  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
