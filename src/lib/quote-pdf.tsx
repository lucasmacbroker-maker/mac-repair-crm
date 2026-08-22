import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface QuoteData {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress?: string;
  clientCity?: string;
  clientPostalCode?: string;
  macModel: string;
  serialNumber?: string;
  faultType: string;
  faultDescription?: string;
  estimatedCost: number;
  createdAt?: Date;
  token: string;
}

const MAC_PLACE = {
  name: "Mac Place",
  address: "39, rue Edouard Vaillant",
  city: "94140 Alfortville",
  phone: "07 82 71 21 23",
  email: "contact@macplace.fr",
};

const LOGO_BASE64 = "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";

function fmt(n: number) {
  return n.toFixed(2).replace(".", ",") + " €";
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 40, color: "#1d1d1f", backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  logo: { width: 65, height: 65 },
  headerRight: { alignItems: "flex-end" },
  title: { fontSize: 26, fontFamily: "Helvetica-Bold", color: "#000000", marginBottom: 4 },
  ref: { fontSize: 9, color: "#666", marginBottom: 2 },
  separator: { borderBottomWidth: 1, borderBottomColor: "#e0e0e0", marginVertical: 14 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  infoBlock: { width: "47%" },
  infoLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  infoName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 2 },
  infoText: { fontSize: 9, color: "#424245", lineHeight: 1.6 },
  tableHeader: { flexDirection: "row", backgroundColor: "#000000", paddingVertical: 7, paddingHorizontal: 8 },
  tableHeaderText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", paddingVertical: 9, paddingHorizontal: 8 },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", paddingVertical: 9, paddingHorizontal: 8, backgroundColor: "#fafafa" },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  cellBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111" },
  cell: { fontSize: 9, color: "#333" },
  cellSmall: { fontSize: 8, color: "#888", marginTop: 2 },
  totalsBlock: { alignItems: "flex-end", marginTop: 14 },
  totalRow: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { fontSize: 9, color: "#555" },
  totalValue: { fontSize: 9, color: "#333" },
  ttcRow: { flexDirection: "row", width: 220, justifyContent: "space-between", backgroundColor: "#000", paddingVertical: 8, paddingHorizontal: 10, marginTop: 4 },
  ttcLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#fff" },
  ttcValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#fff" },
  guaranteeBox: { marginTop: 20, backgroundColor: "#f5f5f7", borderRadius: 4, padding: 11 },
  guaranteeText: { fontSize: 9, color: "#424245", lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8 },
  footerText: { fontSize: 7, color: "#aaa", textAlign: "center", lineHeight: 1.6 },
});

function QuoteDoc({ data }: { data: QuoteData }) {
  const ttc = data.estimatedCost; // prix saisi = TTC
  const ht  = Math.round((ttc / 1.2) * 100) / 100;
  const tva = Math.round((ttc - ht) * 100) / 100;
  const date = data.createdAt ? new Date(data.createdAt) : new Date();
  const num = data.id.slice(0, 8).toUpperCase();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={`data:image/png;base64,${LOGO_BASE64}`} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.title}>DEVIS</Text>
            <Text style={styles.ref}>N° {num}</Text>
            <Text style={styles.ref}>Date : {fmtDate(date)}</Text>
            <Text style={styles.ref}>Valable 30 jours</Text>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Emetteur / Client */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Émetteur</Text>
            <Text style={styles.infoName}>{MAC_PLACE.name}</Text>
            <Text style={styles.infoText}>{MAC_PLACE.address}</Text>
            <Text style={styles.infoText}>{MAC_PLACE.city}</Text>
            <Text style={styles.infoText}>{MAC_PLACE.phone}</Text>
            <Text style={styles.infoText}>{MAC_PLACE.email}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={styles.infoName}>{data.clientFirstName} {data.clientLastName}</Text>
            {data.clientAddress ? <Text style={styles.infoText}>{data.clientAddress}</Text> : null}
            {(data.clientPostalCode || data.clientCity) ? <Text style={styles.infoText}>{[data.clientPostalCode, data.clientCity].filter(Boolean).join(" ")}</Text> : null}
            <Text style={styles.infoText}>{data.clientPhone}</Text>
            <Text style={styles.infoText}>{data.clientEmail}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Prestation</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qté</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>Prix HT</Text>
        </View>

        <View style={styles.tableRow}>
          <View style={styles.colDesc}>
            <Text style={styles.cellBold}>Réparation {data.macModel}</Text>
            <Text style={styles.cellSmall}>Panne : {data.faultType}{data.faultDescription ? " — " + data.faultDescription : ""}</Text>
            {data.serialNumber ? <Text style={styles.cellSmall}>N° série : {data.serialNumber}</Text> : null}
          </View>
          <Text style={[styles.cell, styles.colQty]}>1</Text>
          <Text style={[styles.cell, styles.colPrice]}>{fmt(ht)}</Text>
        </View>

        <View style={styles.tableRowAlt}>
          <View style={styles.colDesc}>
            <Text style={styles.cellBold}>Garantie</Text>
            <Text style={styles.cellSmall}>12 mois pièces et main d'œuvre</Text>
          </View>
          <Text style={[styles.cell, styles.colQty]}>1</Text>
          <Text style={[styles.cell, styles.colPrice]}>Incluse</Text>
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total HT</Text>
            <Text style={styles.totalValue}>{fmt(ht)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA (20 %)</Text>
            <Text style={styles.totalValue}>{fmt(tva)}</Text>
          </View>
          <View style={styles.ttcRow}>
            <Text style={styles.ttcLabel}>TOTAL TTC</Text>
            <Text style={styles.ttcValue}>{fmt(ttc)}</Text>
          </View>
        </View>

        {/* Guarantee box */}
        <View style={styles.guaranteeBox}>
          <Text style={styles.guaranteeText}>
            Garantie 12 mois incluse sur les pièces remplacées et la main d'œuvre. Devis valable 30 jours à compter de la date d'émission. Paiement à réception de la réparation.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {MAC_PLACE.name} — {MAC_PLACE.address}, {MAC_PLACE.city} — {MAC_PLACE.phone} — {MAC_PLACE.email}
          </Text>
          <Text style={styles.footerText}>
            SARL ALCAS SOLUTIONS au capital de 5 000 € — SIREN 984449876 — RCS CRETEIL — NAF 4652Z — TVA intracommunautaire : FR49984449876
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateQuotePDF(data: QuoteData): Promise<Buffer> {
  const buffer = await renderToBuffer(<QuoteDoc data={data} />);
  return Buffer.from(buffer);
}
