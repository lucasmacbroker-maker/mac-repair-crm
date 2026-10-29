import nodemailer from "nodemailer";
import { formatEuro } from "./buyback";

// Même configuration SMTP que les e-mails de réparation (src/lib/email.ts).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM = process.env.SMTP_FROM || "Mac Place <lucas.macbroker@gmail.com>";
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "Mac Place";
const ATELIER = "39 rue du 11 novembre 1918, 94700 Maisons-Alfort";
const BRAND_GREEN = "#2FD756";

export interface BuybackEmailData {
  id: string;
  token: string;
  reference: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  macModel: string;
  configuration: string;
  condition: string;
  offerAmount: number;
  counterOfferAmount?: number | null;
  counterOfferReason?: string;
  finalAmount?: number;
  dropOffMode: string;
  requestedDate?: Date | null;
  requestedSlot?: string;
  appointmentDate?: Date | null;
}

/** Échappe le texte saisi par le client avant de l'insérer dans un e-mail HTML. */
function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const buybackPortalUrl = (token: string) => `${APP_URL}/suivi-reprise/${token}`;

const dateFr = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const dateTimeFr = (d: Date) =>
  d.toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function layout(title: string, body: string, cta?: { href: string; label: string }) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1d1d1f;">
    <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px;">${title}</h1>
    ${body}
    ${
      cta
        ? `<div style="text-align: center; margin: 32px 0;">
            <a href="${cta.href}" style="background-color: ${BRAND_GREEN}; color: #1d1d1f; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-size: 16px; font-weight: 600;">${cta.label}</a>
          </div>
          <p style="color: #86868b; font-size: 13px; line-height: 1.5;">Ou copiez ce lien : <a href="${cta.href}" style="color: #1f67e7;">${cta.href}</a></p>`
        : ""
    }
    <hr style="border: none; border-top: 1px solid #e5e5ea; margin: 32px 0;" />
    <p style="color: #86868b; font-size: 13px;">${COMPANY}<br/>${ATELIER}<br/>07 82 71 21 23</p>
  </div>`;
}

const p = (html: string) => `<p style="color: #424245; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">${html}</p>`;

function recap(b: BuybackEmailData, amount: number) {
  return `
  <div style="background: #f5f5f7; border-radius: 12px; padding: 20px; margin: 24px 0;">
    <p style="margin: 0 0 6px; color: #424245;"><strong>Référence :</strong> ${esc(b.reference)}</p>
    <p style="margin: 0 0 6px; color: #424245;"><strong>Mac :</strong> ${esc(b.macModel)}${b.configuration ? `, ${esc(b.configuration)}` : ""}</p>
    <p style="margin: 0 0 6px; color: #424245;"><strong>État déclaré :</strong> ${esc(b.condition)}</p>
    <p style="margin: 0; color: #1d1d1f; font-size: 18px;"><strong>Offre : ${formatEuro(amount)}</strong></p>
  </div>`;
}

async function send(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    return true;
  } catch (error) {
    console.error(`[BUYBACK EMAIL] « ${subject} » non envoyé :`, error);
    return false;
  }
}

/** Accusé de réception envoyé au client dès que la demande arrive dans le CRM. */
export function sendBuybackConfirmationEmail(b: BuybackEmailData) {
  const next =
    b.dropOffMode === "LOCAL"
      ? p(
          `Vous avez choisi de déposer votre Mac à l'atelier${
            b.requestedDate ? `, idéalement le <strong>${dateFr(b.requestedDate)}</strong>${b.requestedSlot ? ` (${esc(b.requestedSlot).toLowerCase()})` : ""}` : ""
          }. Nous vous appelons pour confirmer l'heure du rendez-vous.`,
        )
      : p("Nous vous envoyons votre bordereau d'expédition prépayé par e-mail très prochainement. Vous pourrez suivre chaque étape sur votre espace de suivi.");
  return send(
    b.clientEmail,
    `${COMPANY} — Votre demande de reprise ${b.reference}`,
    layout(
      `Bonjour ${esc(b.clientFirstName)},`,
      p("Nous avons bien reçu votre demande de reprise.") +
        recap(b, b.offerAmount) +
        next +
        p("Le virement part au plus tard 48 h après la réception de votre Mac, une fois le contrôle effectué."),
      { href: buybackPortalUrl(b.token), label: "Suivre ma reprise" },
    ),
  );
}

/** Notification à chaque changement de statut. */
export function sendBuybackStatusEmail(b: BuybackEmailData, statusLabel: string, statusIcon: string, extraHtml = "") {
  return send(
    b.clientEmail,
    `${COMPANY} — Votre reprise ${b.reference} : ${statusLabel}`,
    layout(
      `Bonjour ${esc(b.clientFirstName)},`,
      p(`Votre reprise <strong>${esc(b.reference)}</strong> (${esc(b.macModel)}) avance :`) +
        `<div style="background: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px;">${statusIcon}</span>
          <p style="font-size: 18px; font-weight: 600; margin: 12px 0 0;">${esc(statusLabel)}</p>
        </div>` +
        extraHtml,
      { href: buybackPortalUrl(b.token), label: "Voir le suivi" },
    ),
  );
}

/** Contre-offre après contrôle : le client accepte ou refuse depuis son espace. */
export function sendBuybackCounterOfferEmail(b: BuybackEmailData) {
  const amount = b.counterOfferAmount ?? 0;
  return send(
    b.clientEmail,
    `${COMPANY} — Nouvelle offre pour votre reprise ${b.reference}`,
    layout(
      `Bonjour ${esc(b.clientFirstName)},`,
      p(`Nos techniciens ont contrôlé votre ${esc(b.macModel)}. Il ne correspond pas tout à fait à la description, nous vous proposons donc une nouvelle offre :`) +
        `<div style="background: #f5f5f7; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 6px; color: #86868b; text-decoration: line-through;">Offre initiale : ${formatEuro(b.offerAmount)}</p>
          <p style="margin: 0 0 10px; font-size: 22px; font-weight: 700;">Nouvelle offre : ${formatEuro(amount)}</p>
          ${b.counterOfferReason ? `<p style="margin: 0; color: #424245;"><strong>Motif :</strong> ${esc(b.counterOfferReason)}</p>` : ""}
        </div>` +
        p("Acceptez-la ou refusez-la depuis votre espace de suivi. Si vous refusez, votre Mac vous est rendu gratuitement."),
      { href: buybackPortalUrl(b.token), label: "Répondre à l'offre" },
    ),
  );
}

/** Rendez-vous confirmé par l'atelier (dépôt LOCAL). */
export function appointmentHtml(date: Date) {
  return p(`Rendez-vous le <strong>${dateTimeFr(date)}</strong> à l'atelier, ${ATELIER}.`);
}

/** Alerte interne quand le client répond à une contre-offre. */
export function sendBuybackDecisionAdminEmail(b: BuybackEmailData, accepted: boolean) {
  const adminEmail = process.env.SMTP_ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return Promise.resolve(false);
  return send(
    adminEmail,
    `${COMPANY} — Reprise ${b.reference} : contre-offre ${accepted ? "acceptée" : "refusée"}`,
    layout(
      `Contre-offre ${accepted ? "acceptée" : "refusée"}`,
      p(
        accepted
          ? `${esc(b.clientFirstName)} ${esc(b.clientLastName)} accepte ${formatEuro(b.counterOfferAmount ?? 0)} pour son ${esc(b.macModel)}. Virement à envoyer.`
          : `${esc(b.clientFirstName)} ${esc(b.clientLastName)} refuse la nouvelle offre pour son ${esc(b.macModel)}. Mac à lui rendre.`,
      ),
      { href: `${APP_URL}/admin/reprises/${b.id}`, label: "Ouvrir la reprise" },
    ),
  );
}

/** Alerte interne à chaque nouvelle demande. */
export function sendBuybackAdminNotification(b: BuybackEmailData) {
  const adminEmail = process.env.SMTP_ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return Promise.resolve(false);
  const mode =
    b.dropOffMode === "LOCAL"
      ? `Dépôt atelier${b.requestedDate ? ` — souhaité le ${dateFr(b.requestedDate)}${b.requestedSlot ? `, ${esc(b.requestedSlot)}` : ""}` : ""}`
      : "Envoi postal — bordereau à créer";
  return send(
    adminEmail,
    `${COMPANY} — Nouvelle reprise : ${b.clientFirstName} ${b.clientLastName} (${b.macModel}, ${formatEuro(b.offerAmount)})`,
    layout(
      "Nouvelle demande de reprise",
      `<div style="background: #f5f5f7; border-radius: 12px; padding: 20px; margin: 24px 0; color: #424245; font-size: 15px;">
        <p style="margin: 0 0 6px;"><strong>Client :</strong> ${esc(b.clientFirstName)} ${esc(b.clientLastName)} — ${esc(b.clientPhone)}</p>
        <p style="margin: 0 0 6px;"><strong>Mac :</strong> ${esc(b.macModel)}${b.configuration ? `, ${esc(b.configuration)}` : ""}</p>
        <p style="margin: 0 0 6px;"><strong>État :</strong> ${esc(b.condition)}</p>
        <p style="margin: 0 0 6px;"><strong>Offre :</strong> ${formatEuro(b.offerAmount)}</p>
        <p style="margin: 0;"><strong>Remise :</strong> ${mode}</p>
      </div>`,
      { href: `${APP_URL}/admin/reprises/${b.id}`, label: "Ouvrir la reprise" },
    ),
  );
}
