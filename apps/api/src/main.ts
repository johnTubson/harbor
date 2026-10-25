import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody: Stripe webhook signatures are computed over the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({
    origin: [
      `http://localhost:${process.env.ADMIN_PORT ?? 3011}`,
      `http://localhost:${process.env.MERCHANT_PORT ?? 3012}`,
      `http://localhost:${process.env.STOREFRONT_PORT ?? 3013}`,
    ],
  });

  const config = new DocumentBuilder()
    .setTitle("Harbor API")
    .setDescription("Multi-tenant marketplace platform API")
    .setVersion("0.1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access-token"
    )
    .addTag("health")
    .addTag("auth")
    .addTag("merchants")
    .addTag("catalog")
    .addTag("search")
    .addTag("storage")
    .addTag("orders")
    .addTag("webhooks")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Harbor API running on http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/docs`);
}

bootstrap();
