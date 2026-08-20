import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateQuotePDF } from "@/lib/quote-pdf";
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { id } = await params;

    const repair = await prisma.repair.findUnique({ where: { id } });
    if (!repair) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });

    // Parse multipart form data to get the bordereau PDF
    const formData = await request.formData();
    const bordereauFile = formData.get("bordereau") as File | null;

    if (!bordereauFile) {
      return NextResponse.json({ error: "Bordereau manquant" }, { status: 400 });
    }

    // Convert bordereau to Buffer
    const bordereauBuffer = Buffer.from(await bordereauFile.arrayBuffer());

    // Regenerate quote PDF
    const quotePdf = await generateQuotePDF({
      id: repair.id,
      clientFirstName: repair.clientFirstName,
      clientLastName: repair.clientLastName,
      clientEmail: repair.clientEmail,
      clientPhone: repair.clientPhone,
      clientAddress: repair.clientAddress,
      clientCity: repair.clientCity,
      clientPostalCode: repair.clientPostalCode,
      macModel: repair.macModel,
      serialNumber: repair.serialNumber,
      faultType: repair.faultType,
      faultDescription: repair.faultDescription,
      estimatedCost: repair.estimatedCost,
      createdAt: repair.createdAt,
      token: repair.token,
    });

    const trackingUrl = `${APP_URL}/suivi/${repair.token}`;
    const clientName = `${repair.clientFirstName} ${repair.clientLastName}`;
    const quoteNum = repair.id.slice(0, 8).toUpperCase();

    await transporter.sendMail({
      from: FROM,
      to: repair.clientEmail,
      subject: `${COMPANY} — Votre devis et bordereau d'envoi`,
      attachments: [
        {
          filename: `Devis-MacPlace-${quoteNum}.pdf`,
          content: quotePdf,
          contentType: "application/pdf",
        },
        {
          filename: `Bordereau-envoi-${quoteNum}.pdf`,
          content: bordereauBuffer,
          contentType: "application/pdf",
        },
      ],
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1d1d1f;">

          <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Bonjour ${clientName},</h1>
          <p style="color: #424245; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Veuillez trouver ci-joint le <strong>devis</strong> ainsi que le <strong>bordereau d'envoi prépayé</strong> pour la réparation de votre <strong>${repair.macModel}</strong>.
          </p>

          <!-- Instructions -->
          <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0; color: #000;">📦 Procédure d'envoi</h2>
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
              <span style="background:#000;color:#fff;border-radius:50%;min-width:22px;height:22px;font-size:12px;font-weight:bold;text-align:center;line-height:22px;margin-right:12px;margin-top:1px;">1</span>
              <p style="margin:0;font-size:14px;color:#333;line-height:1.5;"><strong>Imprimez le bordereau d'envoi</strong> joint à ce mail.</p>
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

          <!-- Suivi -->
          <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">🔍 Suivi en temps réel</h2>
          <p style="color: #424245; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Dès réception de votre appareil, nous procéderons à la réparation dans les plus brefs délais.<br/>
            Suivez l'avancement en temps réel via votre espace personnel :
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
          <p style="color: #424245; font-size: 14px; margin-top: 4px;">
            Bien cordialement,<br/><strong>${COMPANY}</strong>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;" />
          <p style="color: #86868b; font-size: 12px;">
            ${COMPANY} — 5, rue Paul Vaillant Couturier, 94700 Maisons Alfort<br/>
            07 82 71 21 23 — contact@macplace.fr
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send documents error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}
