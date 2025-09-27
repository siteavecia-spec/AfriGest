# E‑Invoicing Plan (Foundations)

## Goals
- Support electronic invoicing per country with compliant numbering, PDF layout, and signature/timestamp where applicable.
- Tenant-level configuration and country-specific rules.

## Scope (Phase 3 groundwork)
- Data model additions (tenant config):
  - `countryCode` (ISO), `invoicePrefix`, `nextInvoiceNumber`, `fiscalId` (if required), `vatId` (optional), `pdfFooter`.
  - Options: include QR on PDF, include fiscal signature.
- Services:
  - Numbering service (per-tenant, per-country rules): returns next invoice number and reserves it.
  - PDF generation service: minimal compliant layout, configurable header/footer, currency/locale.
  - Signature/Timestamp: stubbed in Phase 3, real providers Phase 4+.

## Country Examples (initial targets)
- GN (Guinea): numbering prefix + sequence; include seller details; VAT optional.
- SN (Senegal), CI (Côte d'Ivoire): similar baseline; to be refined with local norms.

## Minimal Invoice PDF Layout (Phase 3)
- Header: logo, company name, address, contacts, invoice number, date.
- Customer: name, contact (optional).
- Lines: SKU/Name, Qty, Unit Price, Discount, Line Total.
- Summary: Subtotal, VAT (if applicable), Total, Currency.
- Footer: configurable legal note and/or QR (stub), signature placeholder.

## API (Phase 3 stub)
- `POST /invoices/preview` → returns PDF (no signature).
- `POST /invoices/issue` → assigns invoice number, returns final PDF (signature stubbed).

## PDF & Signature Providers
- PDF: existing library (jsPDF/PDFKit/HTML‑to‑PDF); server-side recommended for archive.
- Signature/Timestamp: to be integrated Phase 4+: provider TBD; include signature metadata in PDF metadata and/or QR.

## Implementation Roadmap
- Step 1 (Phase 3):
  - Tenant config (country, numbering prefix/sequence).
  - Numbering service + PDF preview/issue (no signature).
  - UI: Issue invoice from POS receipt and Sales page.
- Step 2 (Phase 4):
  - Country refinements (fiscal numbers, required fields).
  - Signature/timestamp provider integration.
  - API endpoints hardened + archival storage (S3 + retention).
- Step 3 (Phase 4+):
  - Partner export (electronic/JSON), webhook for invoices.
  - Validation tools (checksum/QR verification).

## Notes
- Keep currency/locale consistent with tenant settings.
- All amounts numeric with two decimals; VAT computation rules match POS logic.
- Ensure audit logs on issue/cancel.
