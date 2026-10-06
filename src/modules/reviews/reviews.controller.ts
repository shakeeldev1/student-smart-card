import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

const REVIEW_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  listApproved() {
    return this.reviewsService.listApproved();
  }

  @Post()
  @Throttle(REVIEW_THROTTLE)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          cb(
            new BadRequestException('Only JPG, PNG, and WEBP images are allowed'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  submit(
    @UploadedFile() file: Multer.File | undefined,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.submit(dto, file);
  }
}
