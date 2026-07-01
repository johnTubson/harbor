import { Module } from "@nestjs/common";
import { SettlementsModule } from "../modules/settlements/settlements.module";
import { SettlementQueueService } from "./settlement-queue.service";

@Module({
  imports: [SettlementsModule],
  providers: [SettlementQueueService],
  exports: [SettlementQueueService],
})
export class WorkersModule {}
