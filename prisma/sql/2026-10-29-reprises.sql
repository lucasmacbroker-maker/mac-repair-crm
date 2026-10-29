-- Module « Reprises » : création des 3 nouvelles tables.
-- Peut être relancé sans risque (chaque étape est ignorée si déjà faite). À exécuter dans la console SQL de Neon (base du CRM).
-- Script uniquement additif : aucune table existante n'est modifiée ni supprimée.
-- Équivalent de `npx prisma db push` pour les modèles Buyback, BuybackStatusChange et BuybackNote.

CREATE TABLE IF NOT EXISTS "Buyback" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientFirstName" TEXT NOT NULL,
    "clientLastName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientAddress" TEXT NOT NULL DEFAULT '',
    "clientCity" TEXT NOT NULL DEFAULT '',
    "clientPostalCode" TEXT NOT NULL DEFAULT '',
    "macFamily" TEXT NOT NULL,
    "macModel" TEXT NOT NULL,
    "configuration" TEXT NOT NULL DEFAULT '',
    "configManual" BOOLEAN NOT NULL DEFAULT false,
    "condition" TEXT NOT NULL,
    "fault" TEXT NOT NULL DEFAULT '',
    "battery" TEXT NOT NULL DEFAULT '',
    "charger" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "offerAmount" DOUBLE PRECISION NOT NULL,
    "counterOfferAmount" DOUBLE PRECISION,
    "counterOfferReason" TEXT NOT NULL DEFAULT '',
    "counterOfferStatus" TEXT NOT NULL DEFAULT '',
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dropOffMode" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3),
    "requestedSlot" TEXT NOT NULL DEFAULT '',
    "appointmentDate" TIMESTAMP(3),
    "inboundTracking" TEXT NOT NULL DEFAULT '',
    "carrier" TEXT NOT NULL DEFAULT '',
    "trackingLink" TEXT NOT NULL DEFAULT '',
    "labelUrl" TEXT NOT NULL DEFAULT '',
    "ibanEncrypted" TEXT NOT NULL DEFAULT '',
    "ibanLast4" TEXT NOT NULL DEFAULT '',
    "accountHolder" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "receivedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Buyback_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "BuybackStatusChange" (
    "id" TEXT NOT NULL,
    "buybackId" TEXT NOT NULL,
    "userId" TEXT,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuybackStatusChange_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "BuybackNote" (
    "id" TEXT NOT NULL,
    "buybackId" TEXT NOT NULL,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuybackNote_pkey" PRIMARY KEY ("id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "Buyback_token_key" ON "Buyback"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "Buyback_reference_key" ON "Buyback"("reference");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BuybackStatusChange_buybackId_fkey') THEN
    ALTER TABLE "BuybackStatusChange" ADD CONSTRAINT "BuybackStatusChange_buybackId_fkey" FOREIGN KEY ("buybackId") REFERENCES "Buyback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BuybackStatusChange_userId_fkey') THEN
    ALTER TABLE "BuybackStatusChange" ADD CONSTRAINT "BuybackStatusChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BuybackNote_buybackId_fkey') THEN
    ALTER TABLE "BuybackNote" ADD CONSTRAINT "BuybackNote_buybackId_fkey" FOREIGN KEY ("buybackId") REFERENCES "Buyback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BuybackNote_userId_fkey') THEN
    ALTER TABLE "BuybackNote" ADD CONSTRAINT "BuybackNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
