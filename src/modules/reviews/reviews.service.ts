import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Multer } from 'multer';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Review } from './entities/review.entity';
import { ReviewStatus } from './enums/review-status.enum';
import { CreateReviewDto } from './dto/create-review.dto';

export interface PublicReview {
  id: string;
  name: string;
  role: string | null;
  city: string | null;
  rating: number;
  message: string;
  photoUrl: string | null;
  createdAt: Date;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private toPublic(review: Review): PublicReview {
    return {
      id: review.id,
      name: review.name,
      role: review.role,
      city: review.city,
      rating: review.rating,
      message: review.message,
      photoUrl: review.photoUrl,
      createdAt: review.createdAt,
    };
  }

  /** Public submission — creates a PENDING review awaiting admin approval. */
  async submit(
    dto: CreateReviewDto,
    file?: Multer.File,
  ): Promise<{ message: string }> {
    let photoUrl: string | null = null;
    let photoPublicId: string | null = null;
    if (file?.buffer?.length) {
      const uploaded = await this.cloudinary.uploadBuffer(
        file.buffer,
        'reviews',
        file.originalname,
      );
      photoUrl = uploaded.url;
      photoPublicId = uploaded.publicId;
    }

    const review = this.reviewsRepository.create({
      name: dto.name.trim(),
      email: dto.email?.trim() || null,
      role: dto.role?.trim() || null,
      city: dto.city?.trim() || null,
      rating: dto.rating,
      message: dto.message.trim(),
      photoUrl,
      photoPublicId,
      status: ReviewStatus.PENDING,
    });
    await this.reviewsRepository.save(review);

    return {
      message:
        'Thank you! Your review has been submitted and will appear once approved.',
    };
  }

  /** Public — only approved reviews, newest approved first. */
  async listApproved(): Promise<PublicReview[]> {
    const reviews = await this.reviewsRepository.find({
      where: { status: ReviewStatus.APPROVED },
      order: { reviewedAt: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
    return reviews.map((r) => this.toPublic(r));
  }

  /** Admin — full records, optionally filtered by status. */
  async listAdmin(status?: ReviewStatus): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  async setStatus(
    adminId: string,
    id: string,
    status: ReviewStatus,
  ): Promise<Review> {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    review.status = status;
    review.reviewedBy = adminId;
    review.reviewedAt = new Date();
    return this.reviewsRepository.save(review);
  }

  async remove(id: string): Promise<{ message: string }> {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.photoPublicId) {
      await this.cloudinary.destroy(review.photoPublicId).catch(() => undefined);
    }
    await this.reviewsRepository.remove(review);
    return { message: 'Review deleted' };
  }
}
