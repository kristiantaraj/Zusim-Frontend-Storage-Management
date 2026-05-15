-- Soft-delete support for manager-managed master data
ALTER TABLE "products"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "foremen"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "projects"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Print history / retry queue
CREATE TYPE "PrintJobStatus" AS ENUM ('SUCCESS', 'FAILED');

CREATE TABLE "print_jobs" (
  "id" SERIAL NOT NULL,
  "unit_id" TEXT NOT NULL,
  "status" "PrintJobStatus" NOT NULL DEFAULT 'FAILED',
  "error" TEXT,
  "requested_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "print_jobs"
  ADD CONSTRAINT "print_jobs_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "print_jobs_created_at_idx" ON "print_jobs"("created_at");
CREATE INDEX "print_jobs_status_idx" ON "print_jobs"("status");
CREATE INDEX "print_jobs_unit_id_idx" ON "print_jobs"("unit_id");
