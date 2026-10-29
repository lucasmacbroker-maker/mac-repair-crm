// Utilitaires réservés au serveur (clé de chiffrement, clé d'API) : ne jamais importer depuis un composant client.
import crypto from "node:crypto";

// ─── Chiffrement de l'IBAN (AES-256-GCM) ───────────────────────────

function encryptionKey(): Buffer {
  const secret = process.env.BUYBACK_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error("BUYBACK_ENCRYPTION_KEY manquante ou trop courte (16 caractères minimum)");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Format chiffré inconnu");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/** Vérifie la clé partagée envoyée par le site de reprise (comparaison à temps constant). */
export function isValidBuybackApiKey(header: string | null): boolean {
  const expected = process.env.BUYBACK_API_KEY;
  if (!expected || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const want = Buffer.from(expected);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

export function newBuybackReference(now = new Date()): string {
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `RP-${ymd}-${String(crypto.randomInt(0, 10000)).padStart(4, "0")}`;
}
