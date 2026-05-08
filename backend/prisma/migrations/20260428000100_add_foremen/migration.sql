-- CreateTable
CREATE TABLE "foremen" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foremen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "foremen_name_key" ON "foremen"("name");

-- AlterTable
ALTER TABLE "scan_events" ADD COLUMN "foreman_id" INTEGER;

-- AddForeignKey
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_foreman_id_fkey" FOREIGN KEY ("foreman_id") REFERENCES "foremen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
