import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsAdminController } from './reviews-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review]), CloudinaryModule],
  controllers: [ReviewsController, ReviewsAdminController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
