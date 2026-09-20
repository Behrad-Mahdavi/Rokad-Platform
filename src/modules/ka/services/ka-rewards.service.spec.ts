import { Test, TestingModule } from '@nestjs/testing';
import { KaRewardsService } from './ka-rewards.service';

describe('KaRewardsService', () => {
  let service: KaRewardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KaRewardsService],
    }).compile();

    service = module.get<KaRewardsService>(KaRewardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
