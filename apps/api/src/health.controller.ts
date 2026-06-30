import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOkResponse({ description: "Health check" })
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      apps: {
        admin: "http://localhost:3011",
        merchant: "http://localhost:3012",
      },
    };
  }
}
