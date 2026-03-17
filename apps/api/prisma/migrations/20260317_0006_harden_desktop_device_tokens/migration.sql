ALTER TABLE "Device"
ADD COLUMN "deviceTokenHash" TEXT,
ADD COLUMN "deviceTokenIssuedAt" TIMESTAMP(3),
ADD COLUMN "deviceTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "deviceTokenLastUsedAt" TIMESTAMP(3),
ADD COLUMN "deviceTokenRevokedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Device_deviceTokenHash_key" ON "Device"("deviceTokenHash");
