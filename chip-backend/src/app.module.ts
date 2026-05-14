import { Module } from '@nestjs/common';
import { AnomaliesModule } from './anomalies/anomalies.module';
import { AppController } from './app.controller';
import { DataModule } from './data/data.module';
import { DistrictsModule } from './districts/districts.module';
import { OverviewModule } from './overview/overview.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { UnitsModule } from './units/units.module';

@Module({
  imports: [
    DataModule,
    UnitsModule,
    TelemetryModule,
    AnomaliesModule,
    DistrictsModule,
    OverviewModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
