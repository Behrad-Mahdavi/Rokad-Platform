import { Test, TestingModule } from '@nestjs/testing';
import { KaAdminController } from './ka-admin.controller';

describe('KaAdminController', () => {
  let controller: KaAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KaAdminController],
    }).compile();

    controller = module.get<KaAdminController>(KaAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
