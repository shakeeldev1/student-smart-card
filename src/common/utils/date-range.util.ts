import { BadRequestException } from '@nestjs/common';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export function parseDateRange(
  startDate?: string,
  endDate?: string,
): DateRange {
  const range: DateRange = {};

  if (startDate) {
    const from = new Date(startDate);
    if (Number.isNaN(from.getTime())) {
      throw new BadRequestException('startDate is not a valid date');
    }
    from.setHours(0, 0, 0, 0);
    range.from = from;
  }

  if (endDate) {
    const to = new Date(endDate);
    if (Number.isNaN(to.getTime())) {
      throw new BadRequestException('endDate is not a valid date');
    }
    to.setHours(23, 59, 59, 999);
    range.to = to;
  }

  if (range.from && range.to && range.from > range.to) {
    throw new BadRequestException('startDate must be before endDate');
  }

  return range;
}
