import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { workspaceEnvFile } from "./config";
import { HealthController } from "./health.controller";
import { CommonModule } from "./common/common.module";
import { MoneyModule } from "./common/money/money.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { MerchantsModule } from "./modules/merchants/merchants.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { SettlementsModule } from "./modules/settlements/settlements.module";
import { PrismaModule } from "./prisma/prisma.module";
import { WorkersModule } from "./workers/workers.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: workspaceEnvFile(),
      ignoreEnvFile: process.env.NODE_ENV === "production",
    }),
    PrismaModule,
    CommonModule,
    MoneyModule,
    AuditModule,
    AuthModule,
    MerchantsModule,
    CatalogModule,
    OrdersModule,
    SettlementsModule,
    WorkersModule,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
