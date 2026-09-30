import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { AreaService } from './area.service';
import type { SubFilter } from './area.service';

/**
 * Read-only, area-scoped analytics for an AREA_MANAGER. Every response is
 * limited to the manager's own province / region / district / tehsil and
 * contains aggregate figures only — no student personal information.
 */
@Controller('area')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AREA_MANAGER)
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Get('me')
  getMyArea(@CurrentUser('sub') userId: string) {
    return this.areaService.getMyArea(userId);
  }

  @Get('analytics')
  getAnalytics(@CurrentUser('sub') userId: string) {
    return this.areaService.getAnalytics(userId);
  }

  @Get('sub-areas')
  listSubAreas(
    @CurrentUser('sub') userId: string,
    @Query() query: SubFilter,
  ) {
    return this.areaService.listSubAreas(userId, this.pickFilter(query));
  }

  @Get('schools')
  listSchools(
    @CurrentUser('sub') userId: string,
    @Query() query: SubFilter & { search?: string },
  ) {
    return this.areaService.listSchools(
      userId,
      this.pickFilter(query),
      query.search,
    );
  }

  @Get('schools/:id')
  getSchool(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.areaService.getSchoolAggregate(userId, id);
  }

  private pickFilter(query: SubFilter): SubFilter {
    return {
      region: query.region || undefined,
      district: query.district || undefined,
      tehsil: query.tehsil || undefined,
    };
  }
}
