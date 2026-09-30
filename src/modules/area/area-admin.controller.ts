import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { AreaService } from './area.service';
import { CreateAreaManagerDto } from './dto/create-area-manager.dto';
import { UpdateAreaManagerDto } from './dto/update-area-manager.dto';

/**
 * Admin provisioning of area managers. Admins create a manager, assign the
 * area, and the account receives a password-setup link by email.
 */
@Controller('admin/area-managers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AreaAdminController {
  constructor(private readonly areaService: AreaService) {}

  @Get()
  list() {
    return this.areaService.listAreaManagers();
  }

  @Post()
  create(@Body() dto: CreateAreaManagerDto) {
    return this.areaService.createAreaManager(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAreaManagerDto) {
    return this.areaService.updateAreaManager(id, dto);
  }

  @Post(':id/resend-setup')
  resend(@Param('id') id: string) {
    return this.areaService.resendSetup(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.areaService.removeAreaManager(id);
  }
}
