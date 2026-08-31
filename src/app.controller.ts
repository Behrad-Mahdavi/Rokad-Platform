import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Root')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'اطلاعات و وضعیت ریشه پلتفرم رُکاد' })
  getRoot() {
    return {
      name: 'Rokad Multi-Tenant Platform API',
      version: '1.0.0',
      description: 'سامانه چندمستأجری مدیریت مدارس رُکاد (School ERP & LMS)',
      docs: '/api/docs',
      health: '/api/v1/health',
      endpoints: {
        auth: '/api/v1/auth',
        tenants: '/api/v1/tenants',
        featureFlags: '/api/v1/feature-flags',
        health: '/api/v1/health',
      },
    };
  }
}
