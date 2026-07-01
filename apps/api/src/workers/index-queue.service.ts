import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { SearchIndexService } from "../modules/search/search-index.service";

export const INDEX_QUEUE = "product-index";

export type IndexProductJob = {
  productId: string;
};

@Injectable()
export class IndexQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexQueueService.name);
  private queue?: Queue<IndexProductJob>;
  private worker?: Worker<IndexProductJob>;

  constructor(private readonly searchIndexService: SearchIndexService) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.DISABLE_WORKERS === "1"
    ) {
      return;
    }

    const connection = {
      url: process.env.REDIS_URL ?? "redis://localhost:6381",
      maxRetriesPerRequest: null,
    };

    this.queue = new Queue<IndexProductJob>(INDEX_QUEUE, { connection });
    this.worker = new Worker<IndexProductJob>(
      INDEX_QUEUE,
      async (job) => {
        await this.searchIndexService.indexProduct(job.data.productId);
        this.logger.log(`Indexed product ${job.data.productId}`);
      },
      { connection }
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueueProductIndex(productId: string) {
    if (!this.queue) {
      await this.searchIndexService.indexProduct(productId);
      return;
    }

    await this.queue.add(
      "index-product",
      { productId },
      {
        jobId: `index-product-${productId}`,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
  }

  async indexProductNow(productId: string) {
    await this.searchIndexService.indexProduct(productId);
  }
}
