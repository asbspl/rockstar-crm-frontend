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
    return input ? input.slice(0, 10) : "—";
}

function imageUrl(input: unknown): string {
    const path = String(input ?? "").trim();

    if (!path) return "";

    if (/^https?:\/\//i.test(path)) return path;

    const base = String(import.meta.env.VITE_API_BASE_URL || "")
        .replace(/\/$/, "");

    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function createDeliveryChallan(order: Order): string {
    const row = order as OrderDocument;
    const items = order.items ?? [];

    const company = value(
        order.company_name,
        "A S Building Solutions Pvt Ltd",
    );

    const dispatchNo = order.dcsno || order.dispatch_sequence_no;

    const totalQty = items.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
    );

    const clientDCFlag =
        row.delivery_challan_provided ??
        row.client_delivery_challan_provided;

    const clientProvidesDC =
        clientDCFlag === true ||
        clientDCFlag === 1 ||
        String(clientDCFlag ?? "").trim().toLowerCase() === "true" ||
        String(clientDCFlag ?? "").trim() === "1";

    // Header details depend on the selected client's setting.
    const headerName = clientProvidesDC
        ? value(order.client_name)
        : "A S Building Solutions Pvt Ltd";

    const headerAddress = clientProvidesDC
        ? [
            row.client_address_line1,
            row.client_address_line2,
            row.client_city,
            row.client_state,
            row.client_pin_code,
            row.client_country,
        ]
            .filter(Boolean)
            .join(", ")
        : [
            "Pune, Maharashtra, India",
        ].join(", ");

    const headerGstin = clientProvidesDC
        ? value(row.client_gstin)
        : "27AALCA9433D1ZM";

    const headerContact = clientProvidesDC
        ? value(row.client_phone)
        : "8526872687";

    const headerEmail = clientProvidesDC
        ? value(row.client_email)
        : "contact@asbspl.com";

    const headerLogo = clientProvidesDC
        ? imageUrl(row.client_logo)
        : imageUrl(row.company_logo);

    const itemRows = items.map((item, index) => {
        const extra = item as typeof item & {
            product_code?: string;
            hsn_sac?: string;
        };

        return `
            <tr>
                <td class="center">${index + 1}</td>
                <td>
                    <strong>${escapeHtml(item.product_name)}</strong>
                </td>
                <td class="center">${escapeHtml(extra.product_code || "—")}</td>
                <td class="center">${escapeHtml(extra.hsn_sac || "—")}</td>
                <td class="center">${escapeHtml(item.unit)}</td>
                <td class="number">${money(item.quantity)}</td>
            </tr>
        `;
    }).join("");

    const siteDetails: [string, unknown][] = [
        ["Client Name", order.client_name],
        ["Customer", order.customer_name],
        ["Site Name", row.site_name || order.customer_site_name],
        ["Address Line 1", row.address_line_1 || row.customer_address],
        ["Address Line 2", row.address_line_2],
        ["City", row.city],
        ["PIN Code", row.pin_code],
        ["State", row.state],
        ["Country", row.country],
        ["Contact Person", row.site_contact_person],
        ["Contact Number", row.site_contact_number || row.customer_contact],
    ];

    const detailRows = siteDetails.map(([label, content]) => `
        <div class="detail-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value(content))}</strong>
        </div>
    `).join("");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Delivery Challan ${escapeHtml(value(dispatchNo))}</title>

<style>
    @page {
        size: A4;
        margin: 10mm;
    }

    * {
        box-sizing: border-box;
    }

    html,
    body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #111111;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        line-height: 1.4;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .document {
        position: relative;
        isolation: isolate;
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        background: #ffffff;
    }

    .watermark {
        position: fixed;
        z-index: -1;
        top: 43%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-35deg);
        color: #3877b2;
        opacity: 0.055;
        font-size: 65px;
        font-weight: 900;
        letter-spacing: 7px;
        white-space: nowrap;
        pointer-events: none;
        user-select: none;
    }

    .header {
        display: grid;
        grid-template-columns: 125px minmax(0, 1fr) 155px;
        gap: 12px;
        align-items: center;
        min-height: 105px;
        padding: 12px;
        margin-bottom: 10px;
        background: #3877b2;
        color: #ffffff;
        border: 1px solid #111111;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .brand-logo {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 70px;
        padding: 8px 5px;
        background: #ffffff;
        color: #3877b2;
        border: 1px solid #ffffff;
        text-align: center;
    }

    .brand-logo .rockstar {
        font-size: 20px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: -1px;
    }

    .brand-logo sup {
        font-size: 9px;
        vertical-align: top;
    }

    .brand-logo small {
        margin-top: 5px;
        font-size: 7px;
        font-weight: bold;
        letter-spacing: 2px;
    }

    .header-image {
        display: block;
        max-width: 105px;
        max-height: 65px;
        object-fit: contain;
        background: #ffffff;
        padding: 5px;
    }

    .brand {
        min-width: 0;
    }

    .brand h1 {
        margin: 0 0 5px;
        color: #ffffff;
        font-size: 16px;
        font-weight: 800;
        line-height: 1.3;
        overflow-wrap: anywhere;
    }

    .brand p {
        margin: 2px 0;
        color: #ffffff;
        font-size: 8px;
        overflow-wrap: anywhere;
    }

    .doc-title {
        text-align: right;
        min-width: 0;
    }

    .doc-title h2 {
        margin: 0;
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.4;
    }

    .doc-title strong {
        display: block;
        margin-top: 7px;
        color: #ffffff;
        font-size: 13px;
    }

    .meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0;
        margin: 8px 0 10px;
        border: 1px solid #111111;
    }

    .meta > div {
        min-width: 0;
        padding: 7px;
        border-right: 1px solid #111111;
    }

    .meta > div:last-child {
        border-right: 0;
    }

    .meta span,
    .detail-item span {
        display: block;
        margin-bottom: 3px;
        color: #444444;
        font-size: 8px;
        font-weight: 600;
        text-transform: uppercase;
    }

    .meta strong,
    .detail-item strong {
        display: block;
        color: #111111;
        font-size: 9px;
        overflow-wrap: anywhere;
    }

    .panel {
        margin: 9px 0;
        border: 1px solid #111111;
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .section-title {
        margin: 0;
        padding: 6px 8px;
        background: #3877b2;
        color: #ffffff;
        border-bottom: 1px solid #111111;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .details {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        column-gap: 18px;
        row-gap: 0;
        padding: 7px 9px;
    }

    .detail-item {
        display: grid;
        grid-template-columns: 115px minmax(0, 1fr);
        gap: 7px;
        align-items: start;
        min-width: 0;
        padding: 5px 0;
        border-bottom: 1px dotted #b5b5b5;
    }

    .detail-item:nth-last-child(-n+2) {
        border-bottom: 0;
    }

    .detail-item span {
        margin: 0;
        font-size: 8px;
    }

    .detail-item strong {
        font-size: 9px;
    }

    .items {
        width: 100%;
        margin-top: 10px;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 9px;
    }

    .items th,
    .items td {
        padding: 7px 5px;
        border: 1px solid #111111;
        vertical-align: middle;
        overflow-wrap: anywhere;
    }

    .items th {
        background: #3877b2;
        color: #ffffff;
        text-align: left;
        font-size: 8px;
        font-weight: 800;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .items tbody tr:nth-child(even) {
        background: #f7f7f7;
    }

    .items td strong {
        font-weight: 600;
    }

    .number {
        text-align: right !important;
        white-space: nowrap;
    }

    .center {
        text-align: center !important;
    }

    .total-section {
        display: flex;
        justify-content: flex-end;
        margin: 10px 0;
    }

    .totals {
        width: 75mm;
        border: 1px solid #111111;
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .totals > div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 9px;
        border-bottom: 1px solid #111111;
    }

    .totals > div:last-child {
        border-bottom: 0;
        background: #3877b2;
        color: #ffffff;
        font-weight: 800;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .acknowledgement {
        padding: 9px;
    }

    .acknowledgement p {
        margin: 2px 0 10px;
    }

    .signature-row {
        display: flex;
        justify-content: space-between;
        gap: 25px;
        margin-top: 40px;
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .signature {
        flex: 1;
        padding-top: 6px;
        border-top: 1px solid #111111;
        text-align: center;
        font-size: 9px;
    }

    .footer {
        margin-top: 14px;
        padding-top: 7px;
        border-top: 1px solid #111111;
        color: #444444;
        font-size: 8px;
        text-align: center;
    }

    .no-print {
        margin: 12px 0;
        text-align: center;
    }

    .no-print button {
        padding: 8px 18px;
        border: 0;
        border-radius: 3px;
        background: #3877b2;
        color: #ffffff;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
    }

    @media screen and (max-width: 650px) {
        .header {
            grid-template-columns: 90px minmax(0, 1fr);
        }

        .doc-title {
            grid-column: 1 / -1;
            text-align: left;
        }

        .brand-logo .rockstar {
            font-size: 16px;
        }

        .meta {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .meta > div:nth-child(2) {
            border-right: 0;
        }

        .meta > div:nth-child(-n+2) {
            border-bottom: 1px solid #111111;
        }

        .details {
            grid-template-columns: 1fr;
        }

        .detail-item:nth-last-child(2) {
            border-bottom: 1px dotted #b5b5b5;
        }

        .items {
            font-size: 8px;
        }

        .items th,
        .items td {
            padding: 5px 3px;
        }
    }

    @media print {
        .no-print {
            display: none !important;
        }

        .header,
        .section-title,
        .items th,
        .totals > div:last-child {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        thead {
            display: table-header-group;
        }

        tr,
        .panel,
        .totals,
        .signature-row {
            break-inside: avoid;
            page-break-inside: avoid;
        }
    }
</style>
</head>

<body>
<main class="document">

    <div class="watermark" aria-hidden="true">ROCKSTAR®</div>

    <header class="header">

        ${
            headerLogo
                ? `<div class="brand-logo">
                        <img
                            class="header-image"
                            src="${escapeHtml(headerLogo)}"
                            alt="Company logo"
                        >
                   </div>`
                : `<div class="brand-logo">
                        <div class="rockstar">ROCKSTAR<sup>®</sup></div>
                       
                   </div>`
        }

        <div class="brand">
            <h1>${escapeHtml(headerName)}</h1>
            <p>${escapeHtml(value(headerAddress, ""))}</p>
            <p>
                GSTIN: ${escapeHtml(headerGstin)}
                | Contact: ${escapeHtml(headerContact)}
            </p>
            <p>Email: ${escapeHtml(headerEmail)}</p>
        </div>

        <div class="doc-title">
            <h2>GOODS DISPATCH DOCUMENT</h2>
            <strong>${escapeHtml(value(dispatchNo))}</strong>
        </div>

    </header>

    <div class="meta">
        <div>
            <span>Order / PINO</span>
            <strong>${escapeHtml(value(order.pino))}</strong>
        </div>

        <div>
            <span>Sequence No (DCSNO)</span>
            <strong>${escapeHtml(value(dispatchNo))}</strong>
        </div>

        <div>
            <span>Dispatch Date</span>
            <strong>${escapeHtml(date(order.dispatch_date))}</strong>
        </div>

        <div>
            <span>Dispatch Status</span>
            <strong>${escapeHtml(value(order.dispatch_status, "Pending"))}</strong>
        </div>
    </div>

    <section class="panel">
        <h2 class="section-title">Customer Information / Ship To</h2>
        <div class="details">
            ${detailRows}
        </div>
    </section>

    <section class="panel">
        <h2 class="section-title">Dispatch Details</h2>

        <div class="details">
            <div class="detail-item">
                <span>Sequence No</span>
                <strong>${escapeHtml(value(dispatchNo))}</strong>
            </div>

            <div class="detail-item">
                <span>Date Of Dispatch</span>
                <strong>${escapeHtml(date(order.dispatch_date))}</strong>
            </div>

            <div class="detail-item">
                <span>Driver Name</span>
                <strong>${escapeHtml(value(order.driver_name))}</strong>
            </div>

            <div class="detail-item">
                <span>Vehicle Number</span>
                <strong>${escapeHtml(value(order.vehicle_no))}</strong>
            </div>

            <div class="detail-item">
                <span>Type Of Vehicle</span>
                <strong>${escapeHtml(value(order.vehicle_type))}</strong>
            </div>

            <div class="detail-item">
                <span>Driver Contact</span>
                <strong>${escapeHtml(value(order.contact))}</strong>
            </div>
        </div>
    </section>

    <table class="items">
        <thead>
            <tr>
                <th style="width:7%" class="center">#</th>
                <th style="width:35%">Item Description</th>
                <th style="width:16%" class="center">Product Code</th>
                <th style="width:14%" class="center">HSN/SAC</th>
                <th style="width:12%" class="center">Unit</th>
                <th style="width:16%" class="number">Quantity</th>
            </tr>
        </thead>

        <tbody>
            ${
                itemRows ||
                `<tr>
                    <td colspan="6" class="center">No products</td>
                </tr>`
            }
        </tbody>
    </table>

    <section class="total-section">
        <div class="totals">
            <div>
                <span>Total Quantity</span>
                <strong>${money(totalQty)}</strong>
            </div>

            <div>
                <span>Total Items</span>
                <strong>${items.length}</strong>
            </div>
        </div>
    </section>

    <section class="panel">
        <h2 class="section-title">Receiver Acknowledgement</h2>

        <div class="acknowledgement">
            <p>
                Goods received in good condition, subject to verification.
            </p>

            <div class="signature-row">
                <div class="signature">
                    Receiver Name / Signature
                </div>

                <div class="signature">
                    Authorized By / Signature
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        ${escapeHtml(company)}
        | Generated from Order Management
        | ${escapeHtml(new Date().toLocaleDateString("en-IN"))}
    </footer>

    <div class="no-print">
        <button type="button" onclick="window.print()">
            Print / Save as PDF
        </button>
    </div>

</main>
</body>
</html>`;
}
