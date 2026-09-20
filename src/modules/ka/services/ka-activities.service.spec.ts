import { Test, TestingModule } from '@nestjs/testing';
import { KaActivitiesService } from './ka-activities.service';

describe('KaActivitiesService', () => {
  let service: KaActivitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KaActivitiesService],
    }).compile();

    service = module.get<KaActivitiesService>(KaActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
