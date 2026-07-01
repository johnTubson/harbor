import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SearchModule } from "../search/search.module";
import { WorkersModule } from "../../workers/workers.module";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [AuthModule, SearchModule, WorkersModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
