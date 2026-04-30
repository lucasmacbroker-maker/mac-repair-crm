import nodemailer from "nodemailer";

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

export async function sendAppointmentConfirmationEmail(
  email: string,
  clientName: string,
  token: string,
  macModel: string,
  appointmentDate: Date,
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

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: `${COMPANY} — Confirmation de votre rendez-vous`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1d1d1f; font-size: 24px; font-weight: 600;">Bonjour ${clientName},</h1>
          <p style="color: #424245; font-size: 16px; line-height: 1.6;">
            Votre rendez-vous pour la réparation de votre <strong>${macModel}</strong> est confirmé.
          </p>
          <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px;">📅</span>
            <p style="color: #1d1d1f; font-size: 20px; font-weight: 600; margin: 12px 0 4px; text-transform: capitalize;">${dateStr}</p>
            <p style="color: #0071e3; font-size: 24px; font-weight: 700; margin: 0;">${timeStr}</p>
          </div>
          <p style="color: #424245; font-size: 15px; line-height: 1.6;">
            Merci de vous présenter à l'atelier à l'heure indiquée avec votre Mac.<br/>
            ${ADDR ? `<strong>Adresse :</strong> ${ADDR}` : ""}
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
