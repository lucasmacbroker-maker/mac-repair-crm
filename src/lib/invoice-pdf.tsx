import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface InvoiceData {
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
  finalCost: number; // TTC
  createdAt?: Date;
  token: string;
}

const MAC_PLACE = {
  name: "Mac Place",
  address: "5, rue Paul Vaillant Couturier",
  city: "94700 Maisons Alfort",
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
  paymentBox: { marginTop: 20, backgroundColor: "#f0fdf4", borderRadius: 4, padding: 11, borderWidth: 1, borderColor: "#bbf7d0" },
  paymentText: { fontSize: 9, color: "#166534", lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8 },
  footerText: { fontSize: 7, color: "#aaa", textAlign: "center", lineHeight: 1.6 },
});

function InvoiceDoc({ data }: { data: InvoiceData }) {
  const ttc = data.finalCost;
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
            <Text style={styles.title}>FACTURE</Text>
            <Text style={styles.ref}>N° FACT-{num}</Text>
            <Text style={styles.ref}>Date : {fmtDate(date)}</Text>
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
            <Text style={styles.cellSmall}>12 mois pièces et main d&apos;œuvre</Text>
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

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const buffer = await renderToBuffer(<InvoiceDoc data={data} />);
  return Buffer.from(buffer);
}
