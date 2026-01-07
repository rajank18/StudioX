-- CreateTable
CREATE TABLE "public"."VideoDownload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" TEXT,
    "thumbnail" TEXT,
    "service" TEXT NOT NULL DEFAULT 'youtube',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoDownload_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."VideoDownload" ADD CONSTRAINT "VideoDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
