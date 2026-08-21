import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStatusLabel, getStatusIcon } from "@/lib/constants";
import { after } from "next/server";
import { sendStatusUpdateEmail, sendInvoiceEmail } from "@/lib/email";
import { createPaymentSession } from "@/lib/stripe";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { saveFile } from "@/lib/attachments";
import { sendSMS } from "@/lib/sms";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: "Le statut est requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.repair.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Réparation introuvable" },
        { status: 404 }
      );
    }

    if (existing.status === status) {
      return NextResponse.json(
        { error: "Le statut est déjà à cette valeur" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { status };

    if (status === "CLOSED") {
      updateData.closedAt = new Date();
    }

    // Use finalCost if set, otherwise fall back to estimatedCost
    const invoiceCost = existing.finalCost > 0 ? existing.finalCost : existing.estimatedCost;

    // If transitioning to DONE and a cost is set: create Stripe payment link
    let stripePaymentUrl: string | null = null;
    if (status === "DONE" && invoiceCost > 0) {
      try {
        stripePaymentUrl = await createPaymentSession({
          repairId: id,
          clientEmail: existing.clientEmail,
          macModel: existing.macModel,
          faultType: existing.faultType,
          finalCost: invoiceCost,
          successUrl: `${APP_URL}/suivi/${existing.token}?payment=success`,
          cancelUrl: `${APP_URL}/suivi/${existing.token}?payment=cancelled`,
        });
        updateData.paymentLink = stripePaymentUrl;
      } catch (err) {
        console.error("[STRIPE ERROR] Payment session creation failed:", JSON.stringify(err));
        // Continue without blocking the status change
      }
    }

    console.log(`[STATUS] repair=${id} status=${status} invoiceCost=${invoiceCost} stripeUrl=${stripePaymentUrl ? "OK" : "null"}`);

    const [repair] = await prisma.$transaction([
      prisma.repair.update({
        where: { id },
        data: updateData,
        include: {
          technician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.statusChange.create({
        data: {
          repairId: id,
          userId: user.id,
          fromStatus: existing.status,
          toStatus: status,
        },
      }),
    ]);

    const statusLabel = getStatusLabel(status, existing.repairType);
    const statusIcon = getStatusIcon(status, existing.repairType);
    const clientName = `${existing.clientFirstName} ${existing.clientLastName}`;

    after(async () => {
      if (status === "DONE" && stripePaymentUrl && invoiceCost > 0) {
        // Send invoice email with PDF + Stripe payment link
        try {
          const invoicePdf = await generateInvoicePDF({
            id,
            clientFirstName: existing.clientFirstName,
            clientLastName: existing.clientLastName,
            clientEmail: existing.clientEmail,
            clientPhone: existing.clientPhone,
            clientAddress: existing.clientAddress || undefined,
            clientCity: existing.clientCity || undefined,
            clientPostalCode: existing.clientPostalCode || undefined,
            macModel: existing.macModel,
            serialNumber: existing.serialNumber || undefined,
            faultType: existing.faultType,
            faultDescription: existing.faultDescription || undefined,
            finalCost: invoiceCost,
            createdAt: new Date(),
            token: existing.token,
          });

          // Upload invoice PDF to Vercel Blob and save as RepairAttachment
          try {
            const { storedName, url: blobUrl } = await saveFile(invoicePdf, "application/pdf");
            const invoiceNumber = `FACT-${Date.now()}`;
            await prisma.repairAttachment.create({
              data: {
                repairId: id,
                fileName: `Facture-MacPlace-${invoiceNumber}.pdf`,
                storedName,
                url: blobUrl,
                mimeType: "application/pdf",
                size: invoicePdf.length,
                type: "Facture",
              },
            });
          } catch (uploadErr) {
            console.error("Failed to upload invoice to Blob:", uploadErr);
          }

          await sendInvoiceEmail(
            existing.clientEmail,
            clientName,
            existing.token,
            existing.macModel,
            invoiceCost,
            stripePaymentUrl,
            invoicePdf,
          );
        } catch (err) {
          console.error("Failed to send invoice email:", err);
          // Fallback to generic status email
          try {
            await sendStatusUpdateEmail(
              existing.clientEmail, clientName, existing.token,
              existing.macModel, statusLabel, statusIcon
            );
          } catch (e2) {
            console.error("Failed to send fallback status email:", e2);
          }
        }
      } else {
        // Send regular status update email for all other statuses
        try {
          await sendStatusUpdateEmail(
            existing.clientEmail, clientName, existing.token,
            existing.macModel, statusLabel, statusIcon
          );
        } catch (err) {
          console.error("Failed to send status update email:", err);
        }
      }

      // Send SMS notification (non-blocking, best-effort)
      if (existing.clientPhone) {
        const suiviUrl = `${APP_URL}/suivi/${existing.token}`;
        let smsBody: string;
        if (status === "DONE" && stripePaymentUrl) {
          smsBody = `Mac Place — Votre ${existing.macModel} est réparé ! Payez et suivez votre dossier : ${suiviUrl} (Ne pas répondre)`;
        } else {
          smsBody = `Mac Place — ${statusIcon} ${statusLabel} — Suivez votre dossier : ${suiviUrl} (Ne pas répondre)`;
        }
        sendSMS(existing.clientPhone, smsBody).catch((e) =>
          console.error("SMS send failed:", e)
        );
      }
    });

    return NextResponse.json(repair);
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
