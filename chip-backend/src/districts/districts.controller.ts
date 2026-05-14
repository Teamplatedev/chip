import { Controller, Get } from '@nestjs/common';
import { MockService } from '../data/mock.service';

@Controller('districts')
export class DistrictsController {
  constructor(private readonly mock: MockService) {}

  @Get()
  list() {
    return this.mock.getDistricts();
  }

  @Get('heatmap')
  heatmap() {
    return this.mock.getHeatmap();
  }
}
