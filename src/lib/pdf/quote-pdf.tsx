import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0A2540",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  orgName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0A2540",
  },
  orgDetail: {
    fontSize: 9,
    color: "#425466",
    marginTop: 2,
  },
  quoteTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#635BFF",
    textAlign: "right",
  },
  quoteNumber: {
    fontSize: 11,
    color: "#425466",
    textAlign: "right",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1 solid #E3E8EE",
  },
  metaBlock: {},
  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#8898AA",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 10,
    color: "#0A2540",
    marginTop: 3,
  },
  statusBadge: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#635BFF",
    backgroundColor: "#F0EEFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: "right",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F6F8FA",
    borderBottom: "1 solid #E3E8EE",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #F0F0F0",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  colItem: { width: "45%", fontSize: 9 },
  colQty: { width: "15%", fontSize: 9, textAlign: "right" },
  colRate: { width: "20%", fontSize: 9, textAlign: "right" },
  colAmount: { width: "20%", fontSize: 9, textAlign: "right" },
  colItemHeader: {
    width: "45%",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#8898AA",
    textTransform: "uppercase",
  },
  colQtyHeader: {
    width: "15%",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#8898AA",
    textTransform: "uppercase",
    textAlign: "right",
  },
  colRateHeader: {
    width: "20%",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#8898AA",
    textTransform: "uppercase",
    textAlign: "right",
  },
  colAmountHeader: {
    width: "20%",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#8898AA",
    textTransform: "uppercase",
    textAlign: "right",
  },
  itemName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  itemDesc: {
    fontSize: 8,
    color: "#8898AA",
    marginTop: 2,
  },
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 3,
  },
  totalLabel: {
    width: "50%",
    fontSize: 9,
    color: "#425466",
  },
  totalValue: {
    width: "50%",
    fontSize: 9,
    textAlign: "right",
    color: "#0A2540",
  },
  totalRowBold: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 6,
    borderTop: "1 solid #E3E8EE",
    marginTop: 4,
  },
  totalLabelBold: {
    width: "50%",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0A2540",
  },
  totalValueBold: {
    width: "50%",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    color: "#0A2540",
  },
  message: {
    marginTop: 30,
    padding: 12,
    backgroundColor: "#F6F8FA",
    borderRadius: 4,
  },
  messageLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#8898AA",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 9,
    color: "#425466",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#8898AA",
    borderTop: "1 solid #E3E8EE",
    paddingTop: 10,
  },
})

interface QuotePDFProps {
  quote: {
    quoteNumber: string
    createdAt: string
    validUntil: string
    status: string
    subtotal: number
    taxAmount: number
    total: number
    customerMessage: string | null
    lineItems: Array<{
      name: string
      description: string | null
      quantity: number
      unitPrice: number
      total: number
    }>
    customer: {
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
    }
  }
  organization: {
    name: string
    email: string
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  INVOICED: "Invoiced",
  EXPIRED: "Expired",
}

export function QuotePDF({ quote, organization }: QuotePDFProps) {
  const orgAddress = [organization.address, organization.city, organization.state, organization.zip]
    .filter(Boolean)
    .join(", ")

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.orgName}>{organization.name}</Text>
            {organization.email && (
              <Text style={styles.orgDetail}>{organization.email}</Text>
            )}
            {organization.phone && (
              <Text style={styles.orgDetail}>{organization.phone}</Text>
            )}
            {orgAddress && (
              <Text style={styles.orgDetail}>{orgAddress}</Text>
            )}
          </View>
          <View>
            <Text style={styles.quoteTitle}>QUOTE</Text>
            <Text style={styles.quoteNumber}>{quote.quoteNumber}</Text>
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Prepared For</Text>
            <Text style={styles.metaValue}>
              {quote.customer.firstName} {quote.customer.lastName}
            </Text>
            {quote.customer.email && (
              <Text style={styles.orgDetail}>{quote.customer.email}</Text>
            )}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>
              {formatDate(quote.createdAt)}
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Valid Until</Text>
            <Text style={styles.metaValue}>
              {formatDate(quote.validUntil)}
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.statusBadge}>
              {STATUS_LABELS[quote.status] || quote.status}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.tableHeader}>
          <Text style={styles.colItemHeader}>Item</Text>
          <Text style={styles.colQtyHeader}>Qty</Text>
          <Text style={styles.colRateHeader}>Rate</Text>
          <Text style={styles.colAmountHeader}>Amount</Text>
        </View>

        {quote.lineItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <View style={styles.colItem}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.description && (
                <Text style={styles.itemDesc}>{item.description}</Text>
              )}
            </View>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colRate}>${item.unitPrice.toFixed(2)}</Text>
            <Text style={styles.colAmount}>${item.total.toFixed(2)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              ${quote.subtotal.toFixed(2)}
            </Text>
          </View>
          {quote.taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>
                ${quote.taxAmount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.totalRowBold}>
            <Text style={styles.totalLabelBold}>Total</Text>
            <Text style={styles.totalValueBold}>
              ${quote.total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Customer Message */}
        {quote.customerMessage && (
          <View style={styles.message}>
            <Text style={styles.messageLabel}>Message</Text>
            <Text style={styles.messageText}>{quote.customerMessage}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          This quote is valid until {formatDate(quote.validUntil)} |{" "}
          {organization.name}
        </Text>
      </Page>
    </Document>
  )
}
