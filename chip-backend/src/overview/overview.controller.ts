import { Controller, Get } from '@nestjs/common';
import { MockService } from '../data/mock.service';

@Controller('overview')
export class OverviewController {
  constructor(private readonly mock: MockService) {}

  @Get()
  get() {
    return this.mock.getOverview();
  }
}
