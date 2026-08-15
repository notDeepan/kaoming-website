-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locale" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "company" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "industry" TEXT,
    "application" TEXT,
    "material" TEXT,
    "workpieceSize" TEXT,
    "expectedProduction" TEXT,
    "message" TEXT,
    "consentAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadMachine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "seriesSlug" TEXT NOT NULL,
    "seriesName" TEXT NOT NULL,
    "model" TEXT,
    CONSTRAINT "LeadMachine_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    CONSTRAINT "LeadFile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "LeadMachine_leadId_idx" ON "LeadMachine"("leadId");

-- CreateIndex
CREATE INDEX "LeadFile_leadId_idx" ON "LeadFile"("leadId");
