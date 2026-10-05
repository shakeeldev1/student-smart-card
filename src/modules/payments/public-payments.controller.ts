import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';
import { PaymentsService } from './payments.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const assertImage = (file?: Multer.File): Multer.File => {
  if (!file) {
    throw new BadRequestException('A payment screenshot/image is required');
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('Image must be a JPEG, PNG or WEBP file');
  }
  return file;
};

/**
 * Public, no-login payment + tracking link for a school-enrolled student.
 * Access is by an unguessable `publicToken`; it exposes only the limited fields
 * needed to track status and pay the registration fee.
 */
@Controller('public/applications')
export class PublicPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':token')
  getApplication(@Param('token') token: string) {
    return this.paymentsService.getPublicApplication(token);
  }

  @Post(':token/payment')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('proof', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PROOF_SIZE_BYTES },
    }),
  )
  submit(
    @Param('token') token: string,
    @Body() dto: SubmitPaymentDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.paymentsService.submitByPublicToken(token, dto, assertImage(file));
  }
}
