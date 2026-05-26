import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { InvoiceDetailDto } from "@convex/invoices/dto/invoiceDetail";
import { COMPANY } from "@/features/document-pdf/company";

const LEGAL_FOOTER =
  "TVA acquittée sur les débits. Pas d'escompte pour règlement anticipé. " +
  "Tout retard de paiement entraînera une pénalité égale à trois fois le taux d'intérêt légal " +
  "ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).";

const STATUS_LABEL: Record<InvoiceDetailDto["status"], string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  companyBlock: {
    flexDirection: "column",
    gap: 2,
    maxWidth: "55%",
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  companyTagline: {
    fontSize: 8,
    color: "#555",
    marginBottom: 6,
  },
  invoiceMeta: {
    flexDirection: "column",
    gap: 2,
    alignItems: "flex-end",
    maxWidth: "40%",
  },
  invoiceNumber: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  metaLine: {
    fontSize: 9,
  },
  statusPill: {
    marginTop: 4,
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#eee",
    borderRadius: 2,
  },
  clientBlock: {
    marginTop: 4,
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#f7f7f7",
    borderLeftWidth: 2,
    borderLeftColor: "#999",
    flexDirection: "column",
    gap: 2,
  },
  clientLabel: {
    fontSize: 8,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  clientName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  blGroupTitle: {
    fontSize: 8,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "Helvetica-Oblique",
  },
  table: {
    flexDirection: "column",
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#444",
  },
  cellText: {
    fontSize: 9,
  },
  cellMono: {
    fontSize: 9,
    fontFamily: "Courier",
  },
  colNum: { width: "5%" },
  colCode: { width: "16%" },
  colDesignation: { width: "39%", paddingRight: 4 },
  colQty: { width: "8%", textAlign: "right" },
  colPu: { width: "12%", textAlign: "right" },
  colVat: { width: "8%", textAlign: "right" },
  colTotal: { width: "12%", textAlign: "right" },
  totalsBlock: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsTable: {
    width: "40%",
    flexDirection: "column",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalsTtcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  totalsLabel: {
    fontSize: 9,
    color: "#555",
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: "Courier",
  },
  totalsTtcLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  totalsTtcValue: {
    fontSize: 11,
    fontFamily: "Courier-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#aaa",
    paddingTop: 6,
    fontSize: 7,
    color: "#666",
    textAlign: "center",
  },
});

function formatDate(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type VatBucket = { rate: number; ht: number; vat: number };

function aggregateVatBuckets(invoice: InvoiceDetailDto): VatBucket[] {
  const map = new Map<number, VatBucket>();
  for (const df of invoice.deliveryForms) {
    for (const line of df.lines) {
      const cur = map.get(line.vat_rate) ?? {
        rate: line.vat_rate,
        ht: 0,
        vat: 0,
      };
      cur.ht += line.line_total_ht;
      cur.vat += line.line_total_ht * (line.vat_rate / 100);
      map.set(line.vat_rate, cur);
    }
  }
  return Array.from(map.values())
    .map((b) => ({
      rate: b.rate,
      ht: Math.round(b.ht * 100) / 100,
      vat: Math.round(b.vat * 100) / 100,
    }))
    .sort((a, b) => a.rate - b.rate);
}

export function InvoicePdfDocument({ invoice }: { invoice: InvoiceDetailDto }) {
  const isAggregate = invoice.deliveryForms.length > 1;
  const vatBuckets = aggregateVatBuckets(invoice);
  const blSummary = invoice.deliveryForms.map((df) => df.number).join(", ");

  return (
    <Document
      title={`Facture ${invoice.number}`}
      author={COMPANY.name}
      subject={`Facture ${invoice.number} — ${invoice.client.name}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{COMPANY.name}</Text>
            <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
            <Text>{COMPANY.address}</Text>
            <Text>{COMPANY.city}</Text>
            <Text>
              {COMPANY.email} · {COMPANY.phone}
            </Text>
            <Text>
              SIRET {COMPANY.siret} · {COMPANY.vat}
            </Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceNumber}>Facture {invoice.number}</Text>
            <Text style={styles.metaLine}>
              Émise le {formatDate(invoice.createdAt)}
            </Text>
            <Text style={styles.metaLine}>
              Échéance {formatDate(invoice.dueDate)}
            </Text>
            <Text style={styles.metaLine}>
              {isAggregate ? `BL agrégés : ${blSummary}` : `BL : ${blSummary}`}
            </Text>
            <Text style={styles.statusPill}>
              {STATUS_LABEL[invoice.status]}
            </Text>
          </View>
        </View>

        <View style={styles.clientBlock}>
          <Text style={styles.clientLabel}>Facturé à</Text>
          <Text style={styles.clientName}>{invoice.client.name}</Text>
          <Text>Code client : {invoice.client.code}</Text>
          {invoice.client.email ? <Text>{invoice.client.email}</Text> : null}
          {invoice.client.phone ? <Text>{invoice.client.phone}</Text> : null}
        </View>

        {invoice.deliveryForms.map((df, dfIndex) => (
          <View key={df.id} wrap={false} style={{ marginBottom: 8 }}>
            {isAggregate ? (
              <Text style={styles.blGroupTitle}>
                BL {df.number}
                {df.deliveredAt ? ` — livré ${formatDate(df.deliveredAt)}` : ""}
              </Text>
            ) : null}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.thText, styles.colNum]}>#</Text>
                <Text style={[styles.thText, styles.colCode]}>Code</Text>
                <Text style={[styles.thText, styles.colDesignation]}>
                  Désignation
                </Text>
                <Text style={[styles.thText, styles.colQty]}>Qté</Text>
                <Text style={[styles.thText, styles.colPu]}>PU HT</Text>
                <Text style={[styles.thText, styles.colVat]}>TVA</Text>
                <Text style={[styles.thText, styles.colTotal]}>Total HT</Text>
              </View>
              {df.lines.map((line, i) => (
                <View
                  key={`${dfIndex}-${line.product_id}-${i}`}
                  style={styles.tableRow}
                >
                  <Text style={[styles.cellMono, styles.colNum]}>{i + 1}</Text>
                  <Text style={[styles.cellMono, styles.colCode]}>
                    {line.product_code}
                  </Text>
                  <Text style={[styles.cellText, styles.colDesignation]}>
                    {line.product_name}
                  </Text>
                  <Text style={[styles.cellMono, styles.colQty]}>
                    {line.quantity}
                  </Text>
                  <Text style={[styles.cellMono, styles.colPu]}>
                    {formatAmount(line.unit_price_ht)}
                  </Text>
                  <Text style={[styles.cellMono, styles.colVat]}>
                    {formatAmount(line.vat_rate)}%
                  </Text>
                  <Text style={[styles.cellMono, styles.colTotal]}>
                    {formatAmount(line.line_total_ht)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total HT</Text>
              <Text style={styles.totalsValue}>
                {formatAmount(invoice.total_ht)} €
              </Text>
            </View>
            {vatBuckets.map((b) => (
              <View key={b.rate} style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  TVA {formatAmount(b.rate)}% sur {formatAmount(b.ht)} €
                </Text>
                <Text style={styles.totalsValue}>{formatAmount(b.vat)} €</Text>
              </View>
            ))}
            <View style={styles.totalsTtcRow}>
              <Text style={styles.totalsTtcLabel}>Total TTC</Text>
              <Text style={styles.totalsTtcValue}>
                {formatAmount(invoice.total_ttc)} €
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {LEGAL_FOOTER}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBlob(
  invoice: InvoiceDetailDto,
): Promise<Blob> {
  return pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
}
