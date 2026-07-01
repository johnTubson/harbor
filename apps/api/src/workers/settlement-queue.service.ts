import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { SettlementsService } from "../modules/settlements/settlements.service";

export const SETTLEMENT_QUEUE = "settlement-draft";

@Injectable()
export class SettlementQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettlementQueueService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly settlementsService: SettlementsService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test" || process.env.DISABLE_WORKERS === "1") {
      return;
    }

    const connection = {
      url: process.env.REDIS_URL ?? "redis://localhost:6381",
      maxRetriesPerRequest: null,
    };

    this.queue = new Queue(SETTLEMENT_QUEUE, { connection });
    this.worker = new Worker(
      SETTLEMENT_QUEUE,
      async () => {
        const result = await this.settlementsService.runNightlyDraft();
        this.logger.log(
          `Nightly settlement draft: ${result.created.length} record(s)`
        );
        return result;
      },
      { connection }
    );

    void this.queue.add(
      "nightly-draft",
      {},
      {
        repeat: { pattern: "0 2 * * *" },
        jobId: "settlement-nightly-draft",
      }
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async runDraftNow() {
    return this.settlementsService.runNightlyDraft();
  }
}
