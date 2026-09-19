/**
 * Settings that can be edited from the app.
 *
 * An allowlist rather than a free key/value form: the table is a generic
 * store, but anything not listed here is either not a setting yet or is
 * machinery that should not be tuned from a screen. A form that can write any
 * key would eventually be used to write one nothing reads.
 *
 * Every value is still stored as text (the column's type), so `select`
 * options are validated by membership rather than a numeric range.
 */
export const EDITABLE_SETTINGS = {
  near_expiry_days: {
    type: "number",
    label: "Near-expiry warning window",
    description:
      "How many days ahead a batch counts as expiring soon. 90 days is the usual window for returning stock to a distributor.",
    unit: "days",
    min: 7,
    max: 365,
  },
  low_stock_multiplier: {
    type: "number",
    label: "Low-stock sensitivity",
    description:
      "Multiplies each medicine's reorder level. Above 1 flags stock earlier; below 1 waits longer.",
    unit: "×",
    min: 0.1,
    max: 5,
  },
  max_discount_percent: {
    type: "number",
    label: "Discount limit before approval",
    description:
      "A cashier can apply up to this much discount on a sale by themselves. Above it, a manager has to approve before the sale completes. 100 means no limit.",
    unit: "%",
    min: 0,
    max: 100,
  },
  receipt_paper_size: {
    type: "select",
    label: "Receipt paper size",
    description: "Matches the printer connected at the till.",
    options: [
      { value: "58mm", label: "58mm thermal" },
      { value: "80mm", label: "80mm thermal" },
      { value: "a4", label: "A4" },
    ],
  },
  pharmacy_name: {
    type: "text",
    label: "Pharmacy Name",
    description: "Official trading name printed on receipts and invoices.",
  },
  pharmacy_logo: {
    type: "text",
    label: "Pharmacy Logo URL",
    description: "URL or data identifier of the pharmacy brand logo.",
  },
  pharmacy_phone: {
    type: "text",
    label: "Primary Phone",
    description: "Customer service and helpline phone number.",
  },
  pharmacy_email: {
    type: "text",
    label: "Support Email",
    description: "Billing and administrative correspondence email address.",
  },
  pharmacy_address: {
    type: "text",
    label: "Physical Address",
    description: "Physical street address and premises location.",
  },
  pharmacy_license: {
    type: "text",
    label: "DGDA License Number",
    description: "Official drug administration retail pharmacy license identifier.",
  },
  receipt_header_name: {
    type: "text",
    label: "Receipt Header Name",
    description: "Brand name printed at the top of POS slips.",
  },
  receipt_header_tagline: {
    type: "text",
    label: "Receipt Tagline / Subtitle",
    description: "Subtitle printed under the pharmacy name (e.g. Model Pharmacy).",
  },
  receipt_header_address: {
    type: "text",
    label: "Receipt Address",
    description: "Physical branch address printed on POS receipts.",
  },
  receipt_header_phone: {
    type: "text",
    label: "Receipt Hotline / Phone",
    description: "Contact phone numbers printed on POS slips.",
  },
  receipt_header_drug_lic: {
    type: "text",
    label: "Receipt Drug License No",
    description: "DGDA retail pharmacy drug license number on receipts.",
  },
  receipt_header_bin: {
    type: "text",
    label: "Receipt VAT / BIN Number",
    description: "Business Identification Number for NBR VAT compliance.",
  },
  receipt_header_email: {
    type: "text",
    label: "Receipt Email / Website",
    description: "Store email or web domain printed on receipts.",
  },
  receipt_footer_thank_you: {
    type: "text",
    label: "Receipt Thank You Message",
    description: "Prominent greeting message above receipt policy.",
  },
  receipt_footer_return_policy: {
    type: "text",
    label: "Receipt Return & Exchange Policy",
    description: "Multi-line return policy printed at the base of the receipt.",
  },
  receipt_footer_helpline: {
    type: "text",
    label: "Receipt Helpline / Feedback",
    description: "Complaints and feedback phone number printed on the receipt.",
  },
  receipt_footer_tagline: {
    type: "text",
    label: "Receipt Footer Tagline",
    description: "System footer or copyright attribution note.",
  },
  receipt_show_barcode: {
    type: "text",
    label: "Show Barcode on Receipt",
    description: "Toggle invoice barcode printing for laser gun scanners.",
  },
  receipt_show_batch_expiry: {
    type: "text",
    label: "Show Batch & Expiry",
    description: "Toggle medicine batch and expiration dates on receipt items.",
  },
  receipt_show_customer_info: {
    type: "text",
    label: "Show Customer Info",
    description: "Toggle customer name and phone on receipt header.",
  },
  receipt_show_cashier_info: {
    type: "text",
    label: "Show Cashier Info",
    description: "Toggle cashier name and counter number on receipt.",
  },
  receipt_show_amount_in_words: {
    type: "text",
    label: "Show Amount in Words",
    description: "Toggle spelling out total payable amount in words.",
  },
} as const;

export type SettingKey = keyof typeof EDITABLE_SETTINGS;
