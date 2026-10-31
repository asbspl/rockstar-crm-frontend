import type { Order } from "../api/orders.api";

type OrderDocument = Order & Record<string, unknown>;

function value(input: unknown, fallback = "—"): string {
    const result = String(input ?? "").trim();
    return result || fallback;
}

function escapeHtml(input: unknown): string {
    return String(input ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character] ?? character);
}

function money(input: number | string | null | undefined): string {
    const number = Number(input ?? 0);

    return (Number.isFinite(number) ? number : 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function date(input: string | null | undefined): string {
    if (!input) return "—";

    const raw = String(input).slice(0, 10);
    const parts = raw.split("-");

    if (parts.length !== 3) return raw;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function amountInWords(input: number): string {
    const ones = [
        "Zero", "One", "Two", "Three", "Four", "Five",
        "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen",
        "Fifteen", "Sixteen", "Seventeen", "Eighteen",
        "Nineteen",
    ];

    const tens = [
        "", "", "Twenty", "Thirty", "Forty",
        "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
    ];

    function underThousand(number: number): string {
        if (number < 20) return ones[number];

        if (number < 100) {
            return `${tens[Math.floor(number / 10)]}${
                number % 10 ? ` ${ones[number % 10]}` : ""
            }`;
        }

        return `${ones[Math.floor(number / 100)]} Hundred${
            number % 100 ? ` ${underThousand(number % 100)}` : ""
        }`;
    }

    function convert(number: number): string {
        if (number === 0) return "Zero";

        const parts: string[] = [];

        const crore = Math.floor(number / 10000000);
        number %= 10000000;

        const lakh = Math.floor(number / 100000);
        number %= 100000;

        const thousand = Math.floor(number / 1000);
        number %= 1000;

        if (crore) parts.push(`${convert(crore)} Crore`);
        if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
        if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
        if (number) parts.push(underThousand(number));

        return parts.join(" ");
    }

    const paiseTotal = Math.max(
        0,
        Math.round((Number.isFinite(input) ? input : 0) * 100),
    );

    const rupees = Math.floor(paiseTotal / 100);
    const paise = paiseTotal % 100;

    const paiseText = paise
        ? ` and ${underThousand(paise)} Paise`
        : "";

    return `${convert(rupees)} Rupees${paiseText} Only`;
}

export default function createProformaInvoice(order: Order): string {
    const row = order as OrderDocument;
    const items = order.items ?? [];

    const company = value(
        order.company_name,
        "A S Building Solutions Pvt Ltd",
    );

    const totalQty = items.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
    );

    const dispatchNo = order.dcsno || order.dispatch_sequence_no;

    /* PRODUCT ROWS */

    const itemRows = items.map((item, index) => {
        const extra = item as typeof item & {
            product_code?: string;
            hsn_sac?: string;
            product_description?: string;
        };

        return `
            <tr>
                <td class="center">${index + 1}</td>

                <td class="product-cell">
                    <strong>${escapeHtml(item.product_name)}</strong>
                    ${
                        extra.product_description
                            ? `<div class="product-description">${escapeHtml(extra.product_description)}</div>`
                            : ""
                    }
                </td>

                <td class="center">${escapeHtml(value(extra.product_code))}</td>

                <td class="center">${escapeHtml(value(extra.hsn_sac))}</td>

                <td class="center">${escapeHtml(value(item.unit))}</td>

                <td class="number">${money(item.quantity)}</td>

                <td class="number">${money(item.rate_incl_gst)}</td>

                <td class="number">${money(item.amount)}</td>
            </tr>
        `;
    }).join("");

    /* CUSTOMER DETAILS */

    const details = [
        ["Customer Name", order.customer_name],
        ["Site Name", row.site_name || order.customer_site_name],
        ["Address Line 1", row.address_line_1 || row.customer_address],
        ["Address Line 2", row.address_line_2],
        ["City", row.city],
        ["PIN Code", row.pin_code],
        ["State", row.state],
        ["Country", row.country],
        ["Contact Person", row.site_contact_person],
        ["Contact Number", row.site_contact_number || row.customer_contact],
        ["Customer GSTIN", row.client_gstin],
        ["Customer Email", row.customer_email],
    ];

    const detailRows = details.map(([label, content]) => `
        <div class="detail-item">
            <span class="detail-label">${escapeHtml(label)}</span>
            <strong>${escapeHtml(value(content))}</strong>
        </div>
    `).join("");

    /* BANK DETAILS */

    const bankDetails = [
        ["Bank Name", "A S Building Solutions"],
        ["Account Name", "A S Building Solutions Pvt Ltd"],
        ["Account Number", "12345678900"],
        ["IFSC Code", "ABCD0123456"],
        ["Branch", "Pune"],
    ];

    const bankRows = bankDetails.map(([label, content]) => `
        <td>
            <div class="bank-row">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(content)}</strong>
            </div>
        </td>
    `);

    const bankTableRows = `
        <tr>${bankRows.slice(0, 3).join("")}</tr>
        <tr>${bankRows.slice(3).join("")}</tr>
    `;

    /* TOTALS */

    const grandTotal = Number(order.grand_total || 0);

    /* TERMS AND CONDITIONS */

    const terms = [
        {
            heading: "Payment Terms",
            text: [
                "Payment shall be made in favor of “A S Building Solutions Pvt Ltd” immediately after 30 Days delivery.",
                "Payments not made by the due date will incur interest at a rate of 18% per annum.",
                "Cheque returns will attract charges of 500.00 or 2% of the invoice value, whichever is higher.",
            ],
        },
        {
            heading: "Delivery Terms",
            text: [
                "Minimum delivery lead time is 3 days, subject to the mutually agreed delivery schedule.",
                "The minimum order quantity is 100 bags.",
            ],
        },
        {
            heading: "Taxes and Duties",
            text: [
                "The quoted prices are inclusive of 18% GST and transportation charges, provided the minimum order quantity specified in the pricing schedule is met.",
                "For orders below the minimum quantity, transportation charges will be extra, calculated at actual costs.",
                "Unloading (if applicable) is the responsibility of the buyer and must be arranged and borne by the buyer.",
            ],
        },
        {
            heading: "Offer Validity",
            text: [
                "This offer is valid for 15 days from the date of issuance.",
            ],
        },
    ];

    const termsHtml = terms.map((section) => `
        <div class="term-group">
            <strong class="term-heading">${escapeHtml(section.heading)}</strong>
            <ul>
                ${section.text.map((text) => `
                    <li>${escapeHtml(text)}</li>
                `).join("")}
            </ul>
        </div>
    `).join("");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">

<title>Proforma Invoice ${escapeHtml(order.pino)}</title>

<style>
    * {
        box-sizing: border-box;
    }

    html {
        background: #eeeeee;
    }

    body {
        margin: 0;
        padding: 20px 10px;
        background: #eeeeee;
        color: #111111;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        line-height: 1.4;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    /* MAIN DOCUMENT */

    .document {
        position: relative;
        isolation: isolate;
        width: 100%;
        max-width: 210mm;
        min-height: 280mm;
        margin: 0 auto;
        padding: 9mm;
        background: #ffffff;
        border: 1px solid #222222;
    }

    /* ROCKSTAR WATERMARK */

    .watermark {
        position: fixed;
        z-index: 0;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-28deg);
        width: 100%;
        text-align: center;
        color: #000000;
        opacity: 0.055;
        font-size: clamp(45px, 10vw, 100px);
        font-weight: 900;
        letter-spacing: 5px;
        white-space: nowrap;
        pointer-events: none;
        user-select: none;
    }

    .document > *:not(.watermark) {
        position: relative;
        z-index: 1;
    }

    /* HEADER */

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        padding: 22px 20px;
        background: #3877b2;
        color: #ffffff;
        border: 1px solid #285c91;
    }

    /* ROCKSTAR HEADER LOGO */

    .rockstar-logo {
        flex: 0 0 145px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 75px;
        padding: 8px;
        border-right: 1px solid rgba(255,255,255,0.45);
    }

    .rockstar-word {
        color: #ffffff;
        font-size: 23px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        white-space: nowrap;
        text-shadow: 1px 2px 2px rgba(0,0,0,0.2);
    }

    .rockstar-word sup {
        position: relative;
        top: -5px;
        font-size: 10px;
        margin-left: 1px;
    }

    .rockstar-caption {
        margin-top: 7px;
        color: #ffffff;
        font-size: 7px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
    }

    .company-info {
        flex: 1;
        min-width: 0;
    }

    .company-info h1 {
        margin: 0 0 6px;
        color: #ffffff;
        font-size: 17px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }

    .company-address {
        margin: 0 0 5px;
        color: #ffffff;
        font-size: 9px;
    }

    .company-contact {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 12px;
        color: #ffffff;
        font-size: 8px;
    }

    .company-contact span {
        overflow-wrap: anywhere;
    }

    .invoice-title {
        flex: 0 0 130px;
        text-align: right;
        color: #ffffff;
    }

    .invoice-title h2 {
        margin: 0 0 8px;
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        text-decoration: underline;
    }

    .invoice-title strong {
        color: #ffffff;
        font-size: 11px;
        overflow-wrap: anywhere;
    }

    /* ALL SECTION HEADINGS */

    .section {
        margin-top: 12px;
    }

    .section-title {
        margin: 0;
        padding: 7px 9px;
        border: 1px solid #3877b2;
        background: #3877b2;
        color: #ffffff;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }

    /* INVOICE DETAILS */

    .meta-table,
    .items-table,
    .totals-table,
    .bank-table {
        width: 100%;
        border-collapse: collapse;
    }

    .meta-table {
        margin-top: 10px;
    }

    .meta-table td {
        width: 25%;
        padding: 6px 7px;
        border: 1px solid #333333;
        vertical-align: top;
    }

    .meta-label {
        display: block;
        margin-bottom: 3px;
        color: #444444;
        font-size: 8px;
    }

    .meta-value {
        display: block;
        font-size: 9px;
        font-weight: 700;
        overflow-wrap: anywhere;
    }

    /* CUSTOMER DETAILS */

    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .info-panel {
        min-width: 0;
        border: 1px solid #111111;
    }

    .info-panel .section-title {
        border: 0;
        border-bottom: 1px solid #285c91;
    }

    .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
        padding: 5px 7px;
    }

    .detail-item {
        min-width: 0;
        padding: 4px 3px;
        border-bottom: 1px dotted #999999;
    }

    .detail-label {
        display: block;
        margin-bottom: 2px;
        color: #444444;
        font-size: 7.5px;
    }

    .detail-item strong {
        display: block;
        font-size: 8.5px;
        overflow-wrap: anywhere;
    }

    /* DISPATCH DETAILS */

    .dispatch-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        padding: 5px 7px;
    }

    .dispatch-item {
        min-width: 0;
        padding: 6px 4px;
        border-bottom: 1px dotted #999999;
    }

    .dispatch-item span {
        display: block;
        margin-bottom: 3px;
        color: #444444;
        font-size: 7.5px;
    }

    .dispatch-item strong {
        display: block;
        font-size: 9px;
        overflow-wrap: anywhere;
    }

    /* PRODUCT TABLE */

    .items-table {
        margin-top: 0;
        table-layout: fixed;
        font-size: 8.5px;
    }

    .items-table th,
    .items-table td {
        padding: 7px 5px;
        border: 1px solid #222222;
        vertical-align: top;
    }

    .items-table th {
        background: #3877b2;
        color: #ffffff;
        font-size: 8px;
        font-weight: 800;
        text-align: left;
    }

    .items-table td {
        background: transparent;
    }

    .items-table tbody tr {
        break-inside: avoid;
    }

    .items-table .serial-col {
        width: 5%;
    }

    .items-table .product-col {
        width: 27%;
    }

    .items-table .code-col {
        width: 10%;
    }

    .items-table .hsn-col {
        width: 10%;
    }

    .items-table .unit-col {
        width: 8%;
    }

    .items-table .qty-col {
        width: 10%;
    }

    .items-table .rate-col {
        width: 15%;
    }

    .items-table .amount-col {
        width: 15%;
    }

    .product-cell strong {
        display: block;
        font-size: 8.5px;
    }

    .product-description {
        margin-top: 3px;
        font-size: 7.5px;
        color: #444444;
    }

    .center {
        text-align: center !important;
    }

    .number {
        text-align: right !important;
        white-space: nowrap;
    }

    /* TOTALS */

    .totals-wrapper {
        display: flex;
        justify-content: flex-end;
        margin-top: 0;
    }

    .totals-table {
        width: 48%;
        max-width: 300px;
    }

    .totals-table td {
        padding: 6px 8px;
        border: 1px solid #222222;
        font-size: 8.5px;
    }

    .totals-table td:last-child {
        text-align: right;
        font-weight: 700;
        white-space: nowrap;
    }

    .grand-total-row td {
        background: #3877b2;
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
    }

    .amount-words {
        margin-top: 8px;
        padding: 7px;
        border: 1px solid #222222;
        font-size: 8.5px;
        line-height: 1.5;
    }

    .amount-words strong {
        text-transform: uppercase;
    }

    /* BANK DETAILS */

    .bank-table {
        table-layout: fixed;
    }

    .bank-table td {
        width: 33.33%;
        padding: 7px;
        border: 1px solid #222222;
        vertical-align: top;
    }

    .bank-row span {
        display: block;
        margin-bottom: 3px;
        color: #444444;
        font-size: 7.5px;
    }

    .bank-row strong {
        display: block;
        font-size: 8.5px;
        overflow-wrap: anywhere;
    }

    /* TERMS */

    .terms-panel {
        padding: 8px 10px;
        border: 1px solid #222222;
    }

    .terms-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 18px;
    }

    .term-group {
        min-width: 0;
        break-inside: avoid;
    }

    .term-heading {
        display: block;
        margin-bottom: 4px;
        color: #285c91;
        font-size: 8.5px;
        text-decoration: underline;
    }

    .term-group ul {
        margin: 0;
        padding-left: 14px;
    }

    .term-group li {
        margin-bottom: 3px;
        font-size: 7.8px;
        line-height: 1.45;
    }

    /* SIGNATURE */

    .authorization {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        padding: 9px;
        border: 1px solid #222222;
    }

    .authorization-note {
        max-width: 60%;
        font-size: 8px;
    }

    .authorization-note p {
        margin: 4px 0 7px;
    }

    .signature {
        width: 170px;
        text-align: center;
    }

    .signature-space {
        height: 42px;
    }

    .signature-line {
        padding-top: 5px;
        border-top: 1px solid #111111;
        font-size: 8.5px;
        font-weight: 700;
    }

    .signature-company {
        display: block;
        margin-top: 3px;
        font-size: 7.5px;
    }

    /* FOOTER */

    .footer {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 10px;
        padding-top: 6px;
        border-top: 1px solid #222222;
        font-size: 7.5px;
    }

    /* PRINT BUTTON */

    .print-toolbar {
        display: flex;
        justify-content: center;
        margin: 20px auto 0;
    }

    .print-button {
        padding: 10px 22px;
        border: 1px solid #285c91;
        background: #3877b2;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
    }

    .print-button:hover {
        background: #285c91;
    }

    /* RESPONSIVE */

    @media screen and (max-width: 700px) {
        body {
            padding: 8px 4px;
        }

        .document {
            padding: 12px 8px;
        }

        .header {
            flex-wrap: wrap;
            align-items: flex-start;
            padding: 15px 10px;
        }

        .rockstar-logo {
            flex-basis: 115px;
            min-height: 60px;
        }

        .rockstar-word {
            font-size: 19px;
        }

        .company-info {
            flex-basis: calc(100% - 135px);
        }

        .company-info h1 {
            font-size: 13px;
        }

        .invoice-title {
            flex-basis: 100%;
            text-align: left;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.4);
        }

        .meta-table td {
            width: 50%;
        }

        .info-grid {
            grid-template-columns: 1fr;
        }

        .terms-grid {
            grid-template-columns: 1fr;
        }

        .items-section {
            overflow-x: auto;
        }

        .items-table {
            min-width: 650px;
        }

        .totals-table {
            width: 100%;
        }

        .authorization {
            flex-direction: column;
            align-items: flex-start;
        }

        .authorization-note {
            max-width: 100%;
        }

        .signature {
            margin-left: auto;
        }

        .watermark {
            font-size: 48px;
        }
    }

    /* A4 PRINT */

    @page {
        size: A4 portrait;
        margin: 8mm;
    }

    @media print {
        html,
        body {
            width: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff;
        }

        body {
            font-size: 9px;
        }

        .document {
            width: 100%;
            max-width: none;
            min-height: 0;
            margin: 0;
            padding: 0;
            border: 0;
            box-shadow: none;
        }

        .print-toolbar {
            display: none !important;
        }

        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            opacity: 0.055;
            color: #000000;
            font-size: 85px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .header,
        .section-title,
        .items-table th,
        .grand-total-row td,
        .print-button {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .items-table thead {
            display: table-header-group;
        }

        .items-table tr {
            break-inside: avoid;
        }

        .term-group,
        .authorization,
        .info-panel {
            break-inside: avoid;
        }

        .section {
            break-inside: auto;
        }

        button {
            display: none !important;
        }
    }
</style>
</head>

<body>

<main class="document">

    <!-- ROCKSTAR WATERMARK -->

    <div class="watermark" aria-hidden="true">
        ROCKSTAR®
    </div>

    <!-- COMPANY HEADER WITH ROCKSTAR LOGO -->

    <header class="header">

        <div class="rockstar-logo">
            <div class="rockstar-word">
                ROCKSTAR<sup>®</sup>
            </div>
        </div>

        <div class="company-info">

            <h1>${escapeHtml(company)}</h1>

            <p class="company-address">
                ${escapeHtml(value(row.company_address, ""))}
            </p>

            <div class="company-contact">
                <span>GSTIN: ${escapeHtml(value(row.company_gstin))}</span>
                <span>Contact: ${escapeHtml(value(row.company_contact))}</span>
                <span>Email: ${escapeHtml(value(row.company_email))}</span>
            </div>

        </div>

        <div class="invoice-title">
            <h2>Proforma Invoice</h2>
            <strong>Invoice No: ${escapeHtml(order.pino)}</strong>
        </div>

    </header>


    <!-- INVOICE INFORMATION -->

    <section class="section">

        <h2 class="section-title">Invoice Details</h2>

        <table class="meta-table">
            <tbody>
                <tr>
                    <td>
                        <span class="meta-label">Proforma Invoice No.</span>
                        <strong class="meta-value">${escapeHtml(order.pino)}</strong>
                    </td>

                    <td>
                        <span class="meta-label">Proforma Date</span>
                        <strong class="meta-value">${escapeHtml(date(order.proforma_date))}</strong>
                    </td>

                    <td>
                        <span class="meta-label">Expected Shipping Date</span>
                        <strong class="meta-value">${escapeHtml(date(order.expected_shipping_date))}</strong>
                    </td>

                    <td>
                        <span class="meta-label">Reference</span>
                        <strong class="meta-value">${escapeHtml(value(order.reference))}</strong>
                    </td>
                </tr>

                <tr>
                    <td>
                        <span class="meta-label">Client</span>
                        <strong class="meta-value">${escapeHtml(value(order.client_name))}</strong>
                    </td>

                    <td>
                        <span class="meta-label">Place of Supply</span>
                        <strong class="meta-value">${escapeHtml(value(row.state))}</strong>
                    </td>

                    <td>
                        <span class="meta-label">Note / Comment</span>
                        <strong class="meta-value">${escapeHtml(value(order.comment))}</strong>
                    </td>

                    <td>
                        <span class="meta-label">Document Type</span>
                        <strong class="meta-value">Proforma Invoice</strong>
                    </td>
                </tr>
            </tbody>
        </table>

    </section>


    <!-- CUSTOMER AND DISPATCH INFORMATION -->

    <section class="section">

        <div class="info-grid">

            <div class="info-panel">

                <h2 class="section-title">
                    01. Customer / Site Details
                </h2>

                <div class="details-grid">
                    ${detailRows}
                </div>

            </div>

            <div class="info-panel">

                <h2 class="section-title">
                    02. Dispatch Details
                </h2>

                <div class="dispatch-grid">

                    <div class="dispatch-item">
                        <span>Dispatch Sequence No.</span>
                        <strong>${escapeHtml(value(dispatchNo))}</strong>
                    </div>

                    <div class="dispatch-item">
                        <span>Dispatch Date</span>
                        <strong>${escapeHtml(date(order.dispatch_date))}</strong>
                    </div>

                    <div class="dispatch-item">
                        <span>Driver Name</span>
                        <strong>${escapeHtml(value(order.driver_name))}</strong>
                    </div>

                    <div class="dispatch-item">
                        <span>Vehicle Number</span>
                        <strong>${escapeHtml(value(order.vehicle_no))}</strong>
                    </div>

                    <div class="dispatch-item">
                        <span>Vehicle Type</span>
                        <strong>${escapeHtml(value(order.vehicle_type))}</strong>
                    </div>

                    <div class="dispatch-item">
                        <span>Contact Number</span>
                        <strong>${escapeHtml(value(order.contact))}</strong>
                    </div>

                </div>

            </div>

        </div>

    </section>


    <!-- PRODUCT DETAILS -->

    <section class="section items-section">

        <h2 class="section-title">
            03. Product / Item Details
        </h2>

        <table class="items-table">

            <colgroup>
                <col class="serial-col">
                <col class="product-col">
                <col class="code-col">
                <col class="hsn-col">
                <col class="unit-col">
                <col class="qty-col">
                <col class="rate-col">
                <col class="amount-col">
            </colgroup>

            <thead>
                <tr>
                    <th class="center">S/N</th>
                    <th>Particulars</th>
                    <th class="center">Code</th>
                    <th class="center">HSN/SAC</th>
                    <th class="center">Unit</th>
                    <th class="number">Qty</th>
                    <th class="number">Rate (₹)</th>
                    <th class="number">Amount (₹)</th>
                </tr>
            </thead>

            <tbody>
                ${
                    itemRows ||
                    `<tr>
                        <td colspan="8" class="center">
                            No products available
                        </td>
                    </tr>`
                }
            </tbody>

        </table>

    </section>


    <!-- TOTAL SUMMARY -->

    <section class="section">

        <div class="totals-wrapper">

            <table class="totals-table">
                <tbody>
                    <tr>
                        <td>Total Quantity</td>
                        <td>${money(totalQty)}</td>
                    </tr>

                    <tr>
                        <td>Amount (Inclusive of GST)</td>
                        <td>₹ ${money(order.subtotal)}</td>
                    </tr>

                    <tr>
                        <td>Total Discount</td>
                        <td>₹ ${money(order.total_discount)}</td>
                    </tr>

                    <tr class="grand-total-row">
                        <td>GRAND TOTAL</td>
                        <td>₹ ${money(grandTotal)}</td>
                    </tr>
                </tbody>
            </table>

        </div>

        <div class="amount-words">
            <strong>Amount in Words:</strong>
            ${escapeHtml(amountInWords(grandTotal))}
        </div>

    </section>


    <!-- BANK DETAILS -->

    <section class="section">

        <h2 class="section-title">04. Bank Details</h2>

        <table class="bank-table">
            <tbody>
                ${bankTableRows}
            </tbody>
        </table>

    </section>


    <!-- TERMS AND CONDITIONS -->

    <section class="section">

        <h2 class="section-title">
            05. Terms &amp; Conditions
        </h2>

        <div class="terms-panel">
            <div class="terms-grid">
                ${termsHtml}
            </div>
        </div>

    </section>


    <!-- AUTHORIZATION -->

    <section class="section">

        <div class="authorization">

            <div class="authorization-note">

                <strong>Important Note</strong>

                <p>
                    This document is a Proforma Invoice and is not a
                    tax invoice. Final tax invoice will be issued as
                    applicable at the time of supply.
                </p>

                <strong>Thank you for your business!</strong>

            </div>

            <div class="signature">

                <div class="signature-space"></div>

                <div class="signature-line">
                    Authorized Signature
                </div>

                <span class="signature-company">
                    ${escapeHtml(company)}
                </span>

            </div>

        </div>

    </section>


    <!-- FOOTER -->

    <footer class="footer">

        <span>
            <strong>${escapeHtml(company)}</strong>
        </span>

        <span>
            Generated on ${escapeHtml(new Date().toLocaleDateString("en-IN"))}
        </span>

        <span>
            ${escapeHtml(order.pino)}
        </span>

    </footer>


    <!-- PRINT ACTION -->

    <div class="print-toolbar">

        <button
            type="button"
            class="print-button"
            onclick="window.print()"
        >
            Print / Save as PDF
        </button>

    </div>

</main>

</body>
</html>`;
}
