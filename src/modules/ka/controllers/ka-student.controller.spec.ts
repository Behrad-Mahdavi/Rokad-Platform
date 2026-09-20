import { Test, TestingModule } from '@nestjs/testing';
import { KaStudentController } from './ka-student.controller';

describe('KaStudentController', () => {
  let controller: KaStudentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KaStudentController],
    }).compile();

    controller = module.get<KaStudentController>(KaStudentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
