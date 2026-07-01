-- Add full-text search vector column to Product
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector;

-- GIN index for fast FTS queries
CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- Backfill search vectors for existing products
UPDATE "Product"
SET "searchVector" = to_tsvector(
  'english',
  coalesce("title", '') || ' ' || coalesce("description", '')
);
