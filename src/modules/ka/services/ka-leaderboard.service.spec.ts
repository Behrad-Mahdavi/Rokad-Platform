import { Test, TestingModule } from '@nestjs/testing';
import { KaLeaderboardService } from './ka-leaderboard.service';

describe('KaLeaderboardService', () => {
  let service: KaLeaderboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KaLeaderboardService],
    }).compile();

    service = module.get<KaLeaderboardService>(KaLeaderboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
