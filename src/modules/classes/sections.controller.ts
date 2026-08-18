import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Controller('sections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @Roles(UserRole.SCHOOL)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSectionDto) {
    return this.sectionsService.create(user, dto);
  }

  @Get()
  @Roles(UserRole.SCHOOL, UserRole.ADMIN, UserRole.EFU)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
  ) {
    return this.sectionsService.findAllForClass(user, classId);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sectionsService.remove(user, id);
  }
}
