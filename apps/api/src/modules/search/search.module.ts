import { Module } from "@nestjs/common";
import { SearchIndexService } from "./search-index.service";
import { SearchService } from "./search.service";

@Module({
  providers: [SearchService, SearchIndexService],
  exports: [SearchService, SearchIndexService],
})
export class SearchModule {}
