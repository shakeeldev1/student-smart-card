import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CommissionService } from './commission.service';
import {
  CommissionChannel,
  COMMISSION_CHANNELS,
} from './enums/commission-channel.enum';

/** Admin management of per-variant commission overrides + partner payouts. */
@Controller('admin/commission')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get('rates')
  getRates() {
    return this.commissionService.getRateConfig();
  }

  @Put('rates')
  setRates(
    @CurrentUser('sub') adminId: string,
    @Body()
    body: {
      overrides?: Array<{
        channel: string;
        productVariant: number;
        amount: number | null;
      }>;
    },
  ) {
    return this.commissionService.setOverrides(adminId, body.overrides ?? []);
  }

  @Get('payouts')
  listPayouts(
    @Query('channel') channel: string,
    @Query('partnerId') partnerId: string,
  ) {
    const ch = this.parseChannel(channel);
    if (!partnerId) throw new BadRequestException('partnerId is required');
    return this.commissionService.listPayouts(ch, partnerId);
  }

  @Post('payouts')
  recordPayout(
    @CurrentUser('sub') adminId: string,
    @Body()
    body: {
      channel: string;
      partnerId: string;
      amount: number;
      reference?: string;
    },
  ) {
    const ch = this.parseChannel(body.channel);
    if (!body.partnerId) throw new BadRequestException('partnerId is required');
    return this.commissionService.recordPayout(
      ch,
      body.partnerId,
      body.amount,
      body.reference,
      adminId,
    );
  }

  private parseChannel(value: string): CommissionChannel {
    if (!COMMISSION_CHANNELS.includes(value as CommissionChannel)) {
      throw new BadRequestException('Invalid commission channel');
    }
    return value as CommissionChannel;
  }
}
