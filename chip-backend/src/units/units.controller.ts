import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { MockService } from '../data/mock.service';

@Controller('units')
export class UnitsController {
  constructor(private readonly mock: MockService) {}

  @Get()
  list() {
    return this.mock.getUnits();
  }

  @Get(':id')
  one(@Param('id') id: string) {
    const u = this.mock.getUnit(id);
    if (!u) throw new NotFoundException(`Unit ${id} not found`);
    return u;
  }
}
