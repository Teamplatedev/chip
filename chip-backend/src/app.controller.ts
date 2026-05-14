import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { ok: true, service: 'chip-backend', ts: new Date().toISOString() };
  }
}
