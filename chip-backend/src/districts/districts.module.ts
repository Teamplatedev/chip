import { Module } from '@nestjs/common';
import { DistrictsController } from './districts.controller';

@Module({
  controllers: [DistrictsController],
})
export class DistrictsModule {}
