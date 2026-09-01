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
    const isPostal = existing.repairType === "POSTAL";

    // Stripe payment only for POSTAL repairs (LOCAL/HOME pay in person with TPE)
    let stripePaymentUrl: string | null = null;
    if (status === "DONE" && isPostal && invoiceCost > 0) {
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
      if (status === "DONE") {
        const makeWebhookUrl = process.env.MAKE_TIIME_WEBHOOK_URL;
        if (makeWebhookUrl) {
          const ttc = invoiceCost;
          const ht = Math.round((ttc / 1.2) * 100) / 100;
          const tva = Math.round((ttc - ht) * 100) / 100;
          const invoiceNumber = `FACT-${Date.now()}`;
          fetch(makeWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoiceNumber,
              date: new Date().toISOString().split("T")[0],
              client: {
                firstName: existing.clientFirstName,
                lastName: existing.clientLastName,
                fullName: `${existing.clientFirstName} ${existing.clientLastName}`,
                email: existing.clientEmail,
                phone: existing.clientPhone || "",
                address: existing.clientAddress || "",
                city: existing.clientCity || "",
                postalCode: existing.clientPostalCode || "",
                country: "FR",
              },
              repair: {
                id,
                macModel: existing.macModel,
                faultType: existing.faultType,
                serialNumber: existing.serialNumber || "",
                repairType: existing.repairType,
                description: `Réparation ${existing.macModel} — ${existing.faultType}`,
              },
              invoice: {
                amountHT: ht,
                tvaRate: 20,
                tvaAmount: tva,
                amountTTC: ttc,
                tiimeCompanyId: "170176",
              },
            }),
          }).catch((e) => console.error("[MAKE WEBHOOK] failed:", e));
        }
      }

      if (status === "DONE" && (invoiceCost > 0 || !isPostal)) {
        // DONE: always send invoice PDF (with payment link for POSTAL, without for LOCAL/HOME)
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
            existing.clientEmail, clientName, existing.token,
            existing.macModel, invoiceCost,
            isPostal ? stripePaymentUrl : null,
            invoicePdf,
          );
        } catch (err) {
          console.error("Failed to send invoice email:", err);
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
        // Any other status: regular status email
        try {
          await sendStatusUpdateEmail(
            existing.clientEmail, clientName, existing.token,
            existing.macModel, statusLabel, statusIcon
          );
        } catch (err) {
          console.error("Failed to send status update email:", err);
        }
      }

      // SMS notifications
      if (existing.clientPhone) {
        const suiviUrl = `${APP_URL}/suivi/${existing.token}`;

        if (status === "DONE" && isPostal && stripePaymentUrl) {
          // POSTAL: payment SMS + separate review SMS
          sendSMS(existing.clientPhone,
            `Mac Place — Votre ${existing.macModel} est réparé ! Payez et suivez votre dossier : ${suiviUrl} (Ne pas répondre)`
          ).catch((e) => console.error("SMS send failed:", e));
          sendSMS(existing.clientPhone,
            `Merci pour votre confiance ! Pouvez-vous laisser un avis, cela m'aiderait beaucoup 🙂\nBonne journée\nLucas\nhttps://g.page/r/CbXhF3Z6Q3tNEAE/review`
          ).catch((e) => console.error("Review SMS send failed:", e));
        } else if (status === "DONE" && !isPostal) {
          // LOCAL/HOME: single SMS combining notification + review request
          sendSMS(existing.clientPhone,
            `Mac Place — Votre ${existing.macModel} est prêt ! Merci pour votre confiance, pouvez-vous laisser un avis, cela m'aiderait beaucoup 🙂\nBonne journée\nLucas\nhttps://g.page/r/CbXhF3Z6Q3tNEAE/review`
          ).catch((e) => console.error("SMS send failed:", e));
        } else {
          // Other status changes
          sendSMS(existing.clientPhone,
            `Mac Place — ${statusIcon} ${statusLabel} — Suivez votre dossier : ${suiviUrl} (Ne pas répondre)`
          ).catch((e) => console.error("SMS send failed:", e));
        }
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
