import { Global, Logger, Module } from "@nestjs/common";
import { FakeStripeGateway } from "./fake-stripe.gateway";
import { STRIPE_CONFIG, loadStripeConfig, type StripeConfig } from "./stripe.config";
import { StripeGateway } from "./stripe.gateway";
import { StripeSdkGateway } from "./stripe-sdk.gateway";

@Global()
@Module({
  providers: [
    {
      provide: STRIPE_CONFIG,
      useFactory: () => loadStripeConfig(),
    },
    {
      provide: StripeGateway,
      inject: [STRIPE_CONFIG],
      useFactory: (config: StripeConfig) => {
        new Logger("StripeModule").log(`Stripe mode: ${config.mode}`);
        return config.mode === "test" && config.secretKey
          ? new StripeSdkGateway(config.secretKey)
          : new FakeStripeGateway();
      },
    },
  ],
  exports: [STRIPE_CONFIG, StripeGateway],
})
export class StripeModule {}
