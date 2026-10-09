ALTER TABLE "User"
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "EmailVerification"
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "EmailVerification_userId_createdAt_idx"
ON "EmailVerification"("userId", "createdAt");

CREATE INDEX "PasswordReset_userId_createdAt_idx"
ON "PasswordReset"("userId", "createdAt");

CREATE UNIQUE INDEX "PasswordReset_tokenHash_key"
ON "PasswordReset"("tokenHash");