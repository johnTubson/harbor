import { Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WebhooksService } from "./webhooks.service";

/** Populated by Nest when the app is created with `rawBody: true`. */
type RawBodyRequest = { rawBody?: Buffer };

/** Public (no JWT): Stripe authenticates via the signed payload instead. */
@ApiTags("webhooks")
@Controller("webhooks/stripe")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: "Stripe account webhook (payments, billing)" })
  @ApiResponse({ status: 200, description: "Event accepted" })
  @ApiResponse({ status: 400, description: "Missing or invalid signature" })
  account(
    @Req() req: RawBodyRequest,
    @Headers("stripe-signature") signature?: string
  ) {
    return this.webhooksService.receive("account", req.rawBody, signature);
  }

  @Post("connect")
  @HttpCode(200)
  @ApiOperation({ summary: "Stripe Connect webhook (connected account events)" })
  @ApiResponse({ status: 200, description: "Event accepted" })
  @ApiResponse({ status: 400, description: "Missing or invalid signature" })
  connect(
    @Req() req: RawBodyRequest,
    @Headers("stripe-signature") signature?: string
  ) {
    return this.webhooksService.receive("connect", req.rawBody, signature);
  }
}
