import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HARBOR_VERSION } from '@harbor/shared';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @ApiOkResponse({ description: 'Service info' })
  root() {
    return {
      service: 'harbor-api',
      version: HARBOR_VERSION,
      docs: '/docs',
      status: 'ok',
    };
  }
}
