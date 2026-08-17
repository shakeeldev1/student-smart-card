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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL, UserRole.ADMIN)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClassDto) {
    return this.classesService.create(user, dto);
  }

  @Get()
  @Roles(UserRole.SCHOOL, UserRole.ADMIN, UserRole.EFU)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.classesService.findAllForInstitution(user, institutionId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.classesService.remove(user, id);
  }
}
