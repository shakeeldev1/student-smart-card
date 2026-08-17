import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
    } else {
      this.logger.warn(
        'CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are not fully set — file uploads will fail until they are configured.',
      );
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    originalName: string,
  ): Promise<CloudinaryUploadResult> {
    if (!this.configured) {
      throw new InternalServerErrorException(
        'File storage is not configured. Contact support.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          filename_override: originalName,
          use_filename: true,
          unique_filename: true,
        },
        (error: UploadApiErrorResponse | undefined, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error(error?.message ?? 'Unknown Cloudinary upload error');
            reject(
              new InternalServerErrorException('Failed to upload file. Please try again.'),
            );
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      uploadStream.end(buffer);
    });
  }

  async destroy(publicId: string): Promise<void> {
    if (!this.configured) {
      return;
    }
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${error}`);
    }
  }
}
