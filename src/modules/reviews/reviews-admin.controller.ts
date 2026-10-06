import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { ReviewsService } from './reviews.service';
import { ReviewStatus } from './enums/review-status.enum';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReviewsAdminController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(@Query('status') status?: ReviewStatus) {
    return this.reviewsService.listAdmin(status);
  }

  @Patch(':id/approve')
  approve(@CurrentUser('sub') adminId: string, @Param('id') id: string) {
    return this.reviewsService.setStatus(adminId, id, ReviewStatus.APPROVED);
  }

  @Patch(':id/reject')
  reject(@CurrentUser('sub') adminId: string, @Param('id') id: string) {
    return this.reviewsService.setStatus(adminId, id, ReviewStatus.REJECTED);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
