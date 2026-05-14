import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { MockService } from '../data/mock.service';

type Range = '24h' | '7d';

function parseRange(v?: string): Range {
  if (!v || v === '24h') return '24h';
  if (v === '7d') return '7d';
  throw new BadRequestException(`Unsupported range: ${v}`);
}

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly mock: MockService) {}

  @Get('aggregate')
  aggregate(@Query('range') range?: string) {
    return this.mock.getAggregateTelemetry(parseRange(range));
  }

  @Get(':unitId')
  forUnit(@Param('unitId') unitId: string, @Query('range') range?: string) {
    return this.mock.getTelemetry(unitId, parseRange(range));
  }
}
