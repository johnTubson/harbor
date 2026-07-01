import { Module } from "@nestjs/common";
import { SettlementsModule } from "../modules/settlements/settlements.module";
import { SearchModule } from "../modules/search/search.module";
import { IndexQueueService } from "./index-queue.service";
import { SettlementQueueService } from "./settlement-queue.service";

@Module({
  imports: [SettlementsModule, SearchModule],
  providers: [SettlementQueueService, IndexQueueService],
  exports: [SettlementQueueService, IndexQueueService],
})
export class WorkersModule {}
