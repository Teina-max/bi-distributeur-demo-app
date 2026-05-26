import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { DeliveryFormDetailDto } from "@convex/delivery_forms/dto/deliveryFormDetail";
import { COMPANY } from "@/features/document-pdf/company";

const STATUS_LABEL: Record<DeliveryFormDetailDto["status"], string> = {
  draft: "Brouillon",
  ready: "Prêt",
  delivered: "Livré",
  invoiced: "Facturé",
  cancelled: "Annulé",
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
  docMeta: {
    flexDirection: "column",
    gap: 2,
    alignItems: "flex-end",
    maxWidth: "40%",
  },
  docNumber: {
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
  colNum: { width: "6%" },
  colCode: { width: "18%" },
  colDesignation: { width: "46%", paddingRight: 4 },
  colQty: { width: "10%", textAlign: "right" },
  colPu: { width: "10%", textAlign: "right" },
  colTotal: { width: "10%", textAlign: "right" },
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
  signaturesBlock: {
    marginTop: 32,
    flexDirection: "row",
    gap: 16,
  },
  signatureBox: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666",
    textTransform: "uppercase",
  },
  signatureFrame: {
    height: 70,
    borderWidth: 0.5,
    borderColor: "#999",
    borderRadius: 2,
  },
  receiveNotice: {
    marginTop: 12,
    fontSize: 8,
    color: "#555",
    fontStyle: "italic",
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

export function DeliveryFormPdfDocument({
  deliveryForm,
}: {
  deliveryForm: DeliveryFormDetailDto;
}) {
  return (
    <Document
      title={`Bon de livraison ${deliveryForm.number}`}
      author={COMPANY.name}
      subject={`Bon de livraison ${deliveryForm.number} — ${deliveryForm.client.name}`}
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
          <View style={styles.docMeta}>
            <Text style={styles.docNumber}>
              Bon de livraison {deliveryForm.number}
            </Text>
            <Text style={styles.metaLine}>
              Émis le {formatDate(deliveryForm.createdAt)}
            </Text>
            <Text style={styles.metaLine}>
              {deliveryForm.deliveredAt
                ? `Livré le ${formatDate(deliveryForm.deliveredAt)}`
                : "Livraison à programmer"}
            </Text>
            <Text style={styles.statusPill}>
              {STATUS_LABEL[deliveryForm.status]}
            </Text>
          </View>
        </View>

        <View style={styles.clientBlock}>
          <Text style={styles.clientLabel}>Livré à</Text>
          <Text style={styles.clientName}>{deliveryForm.client.name}</Text>
          <Text>Code client : {deliveryForm.client.code}</Text>
          {deliveryForm.client.email ? (
            <Text>{deliveryForm.client.email}</Text>
          ) : null}
          {deliveryForm.client.phone ? (
            <Text>{deliveryForm.client.phone}</Text>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colNum]}>#</Text>
            <Text style={[styles.thText, styles.colCode]}>Code</Text>
            <Text style={[styles.thText, styles.colDesignation]}>
              Désignation
            </Text>
            <Text style={[styles.thText, styles.colQty]}>Qté</Text>
            <Text style={[styles.thText, styles.colPu]}>PU HT</Text>
            <Text style={[styles.thText, styles.colTotal]}>Total HT</Text>
          </View>
          {deliveryForm.lines.map((line, i) => (
            <View key={`${line.product_id}-${i}`} style={styles.tableRow}>
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
              <Text style={[styles.cellMono, styles.colTotal]}>
                {formatAmount(line.line_total_ht)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total HT</Text>
              <Text style={styles.totalsValue}>
                {formatAmount(deliveryForm.total_ht)} €
              </Text>
            </View>
            <View style={styles.totalsTtcRow}>
              <Text style={styles.totalsTtcLabel}>Total TTC</Text>
              <Text style={styles.totalsTtcValue}>
                {formatAmount(deliveryForm.total_ttc)} €
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.receiveNotice}>
          Merci de vérifier la conformité de la marchandise à réception. Toute
          réserve devra être formulée par écrit dans un délai de 48 heures.
        </Text>

        <View style={styles.signaturesBlock}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>
              Livreur — date & signature
            </Text>
            <View style={styles.signatureFrame} />
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>
              Client — bon pour réception
            </Text>
            <View style={styles.signatureFrame} />
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {COMPANY.name} · SIRET {COMPANY.siret} · {COMPANY.vat} ·{" "}
          {COMPANY.email}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderDeliveryFormPdfBlob(
  deliveryForm: DeliveryFormDetailDto,
): Promise<Blob> {
  return pdf(<DeliveryFormPdfDocument deliveryForm={deliveryForm} />).toBlob();
}
