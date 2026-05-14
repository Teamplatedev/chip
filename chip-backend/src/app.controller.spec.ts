import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('returns a health payload', () => {
    const h = appController.health();
    expect(h.ok).toBe(true);
    expect(h.service).toBe('chip-backend');
  });
});
