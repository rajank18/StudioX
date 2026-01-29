-- CreateTable
CREATE TABLE "public"."SilenceRemoverTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputFileName" TEXT NOT NULL,
    "inputFilePath" TEXT NOT NULL,
    "outputFileName" TEXT NOT NULL,
    "outputFilePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "originalDuration" TEXT,
    "processedDuration" TEXT,
    "silenceRemoved" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SilenceRemoverTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."SilenceRemoverTask" ADD CONSTRAINT "SilenceRemoverTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
