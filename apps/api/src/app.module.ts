import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { workspaceEnvFile } from "./config";
import { HealthController } from "./health.controller";
import { CommonModule } from "./common/common.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { MerchantsModule } from "./modules/merchants/merchants.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: workspaceEnvFile(),
      ignoreEnvFile: process.env.NODE_ENV === "production",
    }),
    PrismaModule,
    CommonModule,
    AuditModule,
    AuthModule,
    MerchantsModule,
    CatalogModule,
    OrdersModule,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
