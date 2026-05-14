import { Controller, Get, Query } from '@nestjs/common';
import { MockService } from '../data/mock.service';

@Controller('anomalies')
export class AnomaliesController {
  constructor(private readonly mock: MockService) {}

  @Get()
  list(@Query('limit') limit?: string, @Query('severity') severity?: string) {
    let items = this.mock.getAnomalies();
    if (severity) {
      const wanted = new Set(severity.split(','));
      items = items.filter((a) => wanted.has(a.severity));
    }
    const n = limit ? Math.max(1, Math.min(500, parseInt(limit, 10))) : items.length;
    return items.slice(0, n);
  }
}
