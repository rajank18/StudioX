-- AlterTable
ALTER TABLE "public"."UserOutput" RENAME CONSTRAINT "VideoDownload_pkey" TO "UserOutput_pkey";

-- RenameForeignKey
ALTER TABLE "public"."UserOutput" RENAME CONSTRAINT "VideoDownload_userId_fkey" TO "UserOutput_userId_fkey";
