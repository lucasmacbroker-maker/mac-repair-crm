import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM = process.env.SMTP_FROM || "Mac Place <lucas.macbroker@gmail.com>";
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "Mac Place";
const ADDR = process.env.COMPANY_ADDRESS || "";

export async function sendTrackingEmail(
  email: string,
  clientName: string,
  token: string,
  macModel: string,
) {
  const trackingUrl = `${APP_URL}/suivi/${token}`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: `${COMPANY} — Votre lien de suivi de réparation`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600;">Bonjour ${clientName},</h1>
          <p style="color: #424245; font-size: 16px; line-height: 1.6;">
            Votre dossier de réparation pour votre <strong>${macModel}</strong> a été créé avec succès.
          </p>
          <p style="color: #424245; font-size: 16px; line-height: 1.6;">
            Vous pouvez suivre l'avancement de votre réparation en temps réel en cliquant sur le lien ci-dessous :
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${trackingUrl}" style="background-color: #0071e3; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
              Suivre ma réparation
            </a>
          </div>
          <p style="color: #86868b; font-size: 14px; line-height: 1.5;">
            Ou copiez ce lien dans votre navigateur :<br/>
            <a href="${trackingUrl}" style="color: #0071e3;">${trackingUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="color: #86868b; font-size: 13px;">
            ${COMPANY}<br/>
            ${ADDR || ""}
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendStatusUpdateEmail(
  email: string,
  clientName: string,
  token: string,
  macModel: string,
  statusLabel: string,
  statusIcon: string,
) {
  const trackingUrl = `${APP_URL}/suivi/${token}`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: `${COMPANY} — Mise à jour de votre réparation`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600;">Bonjour ${clientName},</h1>
          <p style="color: #424245; font-size: 16px; line-height: 1.6;">
            Le statut de la réparation de votre <strong>${macModel}</strong> a été mis à jour :
          </p>
          <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px;">${statusIcon}</span>
            <p style="color: #1d1d1f; font-size: 18px; font-weight: 600; margin: 12px 0 0;">${statusLabel}</p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${trackingUrl}" style="background-color: #0071e3; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
              Voir le suivi complet
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="color: #86868b; font-size: 13px;">
            ${COMPANY}<br/>
            ${ADDR || ""}
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send status email:", error);
    return false;
  }
}

export async function sendLinkNotificationEmail(
  email: string,
  clientName: string,
  token: string,
  macModel: string,
  linkType: "tracking" | "payment",
  linkUrl: string,
) {
  const trackingUrl = `${APP_URL}/suivi/${token}`;
  const isTracking = linkType === "tracking";

  const subject = isTracking
    ? `${COMPANY} — Lien de suivi pour votre ${macModel}`
    : `${COMPANY} — Lien de paiement pour votre ${macModel}`;

  const icon = isTracking ? "📦" : "💳";
  const title = isTracking ? "Votre lien de suivi est disponible" : "Lien de paiement disponible";
  const description = isTracking
    ? "Vous pouvez desormais suivre l'expedition de votre Mac en cliquant sur le bouton ci-dessous."
    : "Vous pouvez proceder au paiement de votre reparation en cliquant sur le bouton ci-dessous.";
  const buttonText = isTracking ? "Suivre mon colis" : "Payer maintenant";
  const buttonColor = isTracking ? "#0071e3" : "#34C759";

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600;">Bonjour ${clientName},</h1>
          <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px;">${icon}</span>
            <p style="color: #1d1d1f; font-size: 18px; font-weight: 600; margin: 12px 0 0;">${title}</p>
          </div>
          <p style="color: #424245; font-size: 16px; line-height: 1.6;">
            ${description}
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${linkUrl}" style="background-color: ${buttonColor}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
              ${buttonText}
            </a>
          </div>
          <p style="color: #86868b; font-size: 14px; line-height: 1.5;">
            Vous pouvez aussi consulter votre page de suivi :<br/>
            <a href="${trackingUrl}" style="color: #0071e3;">${trackingUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="color: #86868b; font-size: 13px;">
            ${COMPANY}<br/>
            ${ADDR || ""}
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send link notification email:", error);
    return false;
  }
}

export async function sendNewRepairNotification(
  clientName: string,
  macModel: string,
  faultType: string,
  repairType: string,
  repairId: string,
) {
  const adminEmail = process.env.SMTP_ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return false;

  const repairUrl = `${APP_URL}/admin/repairs/${repairId}`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: adminEmail,
      subject: `${COMPANY} — Nouveau ticket : ${clientName} (${macModel})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600;">Nouveau ticket de reparation</h1>
          <div style="background: #f5f5f7; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #424245; font-size: 15px; margin: 0 0 8px;"><strong>Client :</strong> ${clientName}</p>
            <p style="color: #424245; font-size: 15px; margin: 0 0 8px;"><strong>Modele :</strong> ${macModel}</p>
            <p style="color: #424245; font-size: 15px; margin: 0 0 8px;"><strong>Panne :</strong> ${faultType}</p>
            <p style="color: #424245; font-size: 15px; margin: 0;"><strong>Type :</strong> ${repairType === "POSTAL" ? "Postal" : "Atelier"}</p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${repairUrl}" style="background-color: #0071e3; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
              Voir le ticket
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="color: #86868b; font-size: 13px;">
            ${COMPANY}<br/>
            ${ADDR || ""}
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send new repair notification:", error);
    return false;
  }
}

export async function sendPromoEmail(
  recipients: { email: string; firstName: string }[],
  subject: string,
  introText: string,
  products: { name: string; description: string; price: number }[],
) {
  const productsHtml = products
    .map(
      (p) => `
      <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <p style="color: #1d1d1f; font-size: 16px; font-weight: 600; margin: 0 0 4px;">${p.name}</p>
          ${p.description ? `<p style="color: #86868b; font-size: 14px; margin: 0;">${p.description}</p>` : ""}
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 16px;">
          <p style="color: #0071e3; font-size: 18px; font-weight: 700; margin: 0;">${p.price.toFixed(2)} €</p>
        </div>
      </div>`,
    )
    .join("");

  let sent = 0;
  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: FROM,
        to: recipient.email,
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1d1d1f; font-size: 28px; font-weight: 700; margin: 0;">${COMPANY}</h1>
              <p style="color: #86868b; font-size: 14px; margin: 8px 0 0;">Nos dernières nouveautés</p>
            </div>
            <h2 style="color: #1d1d1f; font-size: 20px; font-weight: 600;">Bonjour ${recipient.firstName},</h2>
            <p style="color: #424245; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">${introText}</p>
            <h3 style="color: #1d1d1f; font-size: 17px; font-weight: 600; margin-bottom: 16px;">Produits disponibles</h3>
            ${productsHtml}
            <div style="text-align: center; margin: 40px 0 24px;">
              <p style="color: #424245; font-size: 15px;">Pour plus d'informations ou pour réserver un produit, contactez-nous :</p>
              <p style="color: #0071e3; font-size: 15px; font-weight: 500;">${process.env.NEXT_PUBLIC_COMPANY_EMAIL || ""}</p>
              <p style="color: #0071e3; font-size: 15px; font-weight: 500;">${process.env.NEXT_PUBLIC_COMPANY_PHONE || ""}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
            <p style="color: #86868b; font-size: 12px; text-align: center;">
              ${COMPANY}${ADDR ? ` — ${ADDR}` : ""}<br/>
              <span style="color: #c7c7cc;">Vous recevez ce mail car vous êtes client ${COMPANY}.</span>
            </p>
          </div>
        `,
      });
      sent++;
    } catch {
      // continue sending to others
    }
  }
  return sent;
}

export async function sendAppointmentConfirmationEmail(
  email: string,
  clientName: string,
  token: string,
  macModel: string,
  appointmentDate: Date,
  isHome = false,
  clientAddress = "",
) {
  const trackingUrl = `${APP_URL}/suivi/${token}`;

  const dateStr = appointmentDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = appointmentDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const locationLine = isHome
    ? clientAddress
      ? `Notre technicien se déplacera à votre adresse :<br/><strong>${clientAddress}</strong>`
      : `Notre technicien se déplacera à votre domicile à l'heure indiquée.`
    : ADDR
    ? `Merci de vous présenter à l'atelier à l'heure indiquée avec votre Mac.<br/><strong>Adresse :</strong> ${ADDR}`
    : `Merci de vous présenter à l'atelier à l'heure indiquée avec votre Mac.`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: `${COMPANY} — Confirmation de votre rendez-vous`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600;">Bonjour ${clientName},</h1>
          <p style="color: #424245; font-size: 16px; line-height: 1.6;">
            Votre rendez-vous ${isHome ? "à domicile" : "en atelier"} pour la réparation de votre <strong>${macModel}</strong> est confirmé.
          </p>
          <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px;">${isHome ? "🏠" : "📅"}</span>
            <p style="color: #1d1d1f; font-size: 20px; font-weight: 600; margin: 12px 0 4px; text-transform: capitalize;">${dateStr}</p>
            <p style="color: #0071e3; font-size: 24px; font-weight: 700; margin: 0;">${timeStr}</p>
          </div>
          <p style="color: #424245; font-size: 15px; line-height: 1.6;">
            ${locationLine}
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${trackingUrl}" style="background-color: #0071e3; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
              Voir mon dossier de suivi
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="color: #86868b; font-size: 13px;">
            ${COMPANY}<br/>
            ${ADDR || ""}
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send appointment confirmation email:", error);
    return false;
  }
}

export async function sendQuoteValidatedEmail(
  clientEmail: string,
  clientName: string,
  macModel: string,
  repairId: string,
) {
  const adminEmail = process.env.SMTP_ADMIN_EMAIL || process.env.SMTP_USER;
  const repairUrl = `${APP_URL}/admin/repairs/${repairId}`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: adminEmail,
      subject: `${COMPANY} — Devis validé par ${clientName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600;">Devis validé !</h1>
          <p style="color: #424245; font-size: 16px; line-height: 1.6;">
            Le client <strong>${clientName}</strong> (${clientEmail}) a validé le devis pour la réparation de son <strong>${macModel}</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${repairUrl}" style="background-color: #34C759; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500;">
              Voir la réparation
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="color: #86868b; font-size: 13px;">
            ${COMPANY}<br/>
            ${ADDR || ""}
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send quote validated email:", error);
    return false;
  }
}

export async function sendInvoiceEmail(
  email: string,
  clientName: string,
  token: string,
  macModel: string,
  finalCost: number,
  paymentUrl: string,
  invoicePdfBuffer: Buffer,
) {
  const trackingUrl = `${APP_URL}/suivi/${token}`;
  const num = token.slice(0, 8).toUpperCase();

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: `${COMPANY} — Votre Mac est réparé — Facture et lien de paiement`,
      attachments: [
        {
          filename: `Facture-MacPlace-FACT-${num}.pdf`,
          content: invoicePdfBuffer,
          contentType: "application/pdf",
        },
      ],
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1d1d1f;">
          <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Bonjour ${clientName},</h1>
          <p style="color: #424245; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Bonne nouvelle ! La réparation de votre <strong>${macModel}</strong> est terminée.<br/>
            Veuillez trouver ci-joint votre <strong>facture</strong>.
          </p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
            <p style="color: #166534; font-size: 14px; margin: 0 0 4px;">Montant à régler</p>
            <p style="color: #166534; font-size: 32px; font-weight: 700; margin: 0 0 16px;">${finalCost.toFixed(2).replace(".", ",")} €&nbsp;TTC</p>
            <a href="${paymentUrl}" style="background-color: #16a34a; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
              💳&nbsp; Payer maintenant
            </a>
          </div>

          <p style="color: #424245; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">
            Vous pouvez également suivre l'avancement de votre dossier sur votre espace de suivi :
          </p>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${trackingUrl}" style="color: #0071e3; font-size: 14px;">${trackingUrl}</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;" />
          <p style="color: #86868b; font-size: 12px;">
            ${COMPANY} — 5, rue Paul Vaillant Couturier, 94700 Maisons Alfort<br/>
            07 82 71 21 23 — contact@macplace.fr
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    return false;
  }
}

export async function sendPostalRepairEmail(
  email: string,
  clientName: string,
  token: string,
  macModel: string,
  repairId: string,
  quotePdfBuffer: Buffer,
  bordereauBuffer?: Buffer,
) {
  const trackingUrl = `${APP_URL}/suivi/${token}`;
  const packlinkUrl = `https://pro.packlink.fr/private/shipments/new`;
  void packlinkUrl; // kept for reference

  const quoteNum = repairId.slice(0, 8).toUpperCase();
  const attachments: Attachment[] = [
    {
      filename: `Devis-MacPlace-${quoteNum}.pdf`,
      content: quotePdfBuffer,
      contentType: "application/pdf",
    },
  ];
  if (bordereauBuffer) {
    attachments.push({
      filename: `Bordereau-envoi-${quoteNum}.pdf`,
      content: bordereauBuffer,
      contentType: "application/pdf",
    });
  }

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: bordereauBuffer
        ? `${COMPANY} — Votre devis et bordereau d'envoi`
        : `${COMPANY} — Confirmation de votre demande de réparation`,
      attachments,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1d1d1f;">

          <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Bonjour ${clientName},</h1>
          <p style="color: #424245; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            ${bordereauBuffer
              ? `Veuillez trouver ci-joint le <strong>devis</strong> ainsi que le <strong>bordereau d'envoi prépayé</strong> pour la réparation de votre <strong>${macModel}</strong>.`
              : `Votre demande de réparation pour votre <strong>${macModel}</strong> a bien été enregistrée. Veuillez trouver ci-joint votre <strong>devis</strong>.`
            }
          </p>

          <!-- Instructions emballage -->
          <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0; color: #000;">📦 Procédure d'envoi</h2>
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
              <span style="background:#000;color:#fff;border-radius:50%;min-width:22px;height:22px;font-size:12px;font-weight:bold;text-align:center;line-height:22px;margin-right:12px;margin-top:1px;">1</span>
              <p style="margin:0;font-size:14px;color:#333;line-height:1.5;">
                ${bordereauBuffer
                  ? `<strong>Imprimez le bordereau d'envoi</strong> joint à ce mail.`
                  : `Vous recevrez prochainement un <strong>bordereau d'envoi prépayé</strong> par email. Imprimez-le dès réception.`
                }
              </p>
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
              <span style="background:#000;color:#fff;border-radius:50%;min-width:22px;height:22px;font-size:12px;font-weight:bold;text-align:center;line-height:22px;margin-right:12px;margin-top:1px;">2</span>
              <p style="margin:0;font-size:14px;color:#333;line-height:1.5;"><strong>Emballez soigneusement votre Mac</strong> dans un colis adapté avec du papier bulle ou de la mousse de protection.</p>
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
              <span style="background:#000;color:#fff;border-radius:50%;min-width:22px;height:22px;font-size:12px;font-weight:bold;text-align:center;line-height:22px;margin-right:12px;margin-top:1px;">3</span>
              <p style="margin:0;font-size:14px;color:#333;line-height:1.5;"><strong>Collez le bordereau</strong> imprimé sur le colis.</p>
            </div>
            <div style="display: flex; align-items: flex-start;">
              <span style="background:#000;color:#fff;border-radius:50%;min-width:22px;height:22px;font-size:12px;font-weight:bold;text-align:center;line-height:22px;margin-right:12px;margin-top:1px;">4</span>
              <p style="margin:0;font-size:14px;color:#333;line-height:1.5;"><strong>Déposez le colis</strong> au bureau de poste ou point relais le plus proche.</p>
            </div>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;" />

          <!-- Suivi temps réel -->
          <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">🔍 Suivi en temps réel</h2>
          <p style="color: #424245; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Dès réception de votre appareil, nous procéderons à la réparation dans les plus brefs délais.<br/>
            Vous serez informé à chaque étape via votre espace de suivi personnel :
          </p>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${trackingUrl}" style="background-color: #0071e3; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">
              Suivre ma réparation en temps réel
            </a>
            <p style="font-size: 11px; color: #86868b; margin-top: 8px;">${trackingUrl}</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;" />

          <p style="color: #424245; font-size: 14px; line-height: 1.6;">
            N'hésitez pas à nous contacter si vous avez la moindre question.
          </p>
          <p style="color: #424245; font-size: 14px; line-height: 1.6; margin-top: 4px;">
            Bien cordialement,<br/>
            <strong>${COMPANY}</strong>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;" />
          <p style="color: #86868b; font-size: 12px;">
            ${COMPANY} — 5, rue Paul Vaillant Couturier, 94700 Maisons Alfort<br/>
            07 82 71 21 23 — contact@macplace.fr
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send postal repair email:", error);
    return false;
  }
}
