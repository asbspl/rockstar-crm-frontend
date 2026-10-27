
import React, { useEffect } from "react";
import "./QuotationPrint.css";

type QuotationItem = {
    id?: number | string;
    product_id?: number;
    product_name?: string | null;
    description?: string | null;
    product_code?: string | null;
    hsn_sac?: string | null;
    unit?: string | null;
    quantity?: number | string | null;
    rate?: number | string | null;
    rate_incl_gst?: number | string | null;
    amount?: number | string | null;
};

type QuotationParty = {
    company_name?: string | null;
    name?: string | null;
    client_name?: string | null;
    customer_name?: string | null;
    address?: string | null;
    company_address?: string | null;
    client_address?: string | null;
    phone?: string | null;
    contact_number?: string | null;
    email?: string | null;
    gstin?: string | null;
    company_gstin?: string | null;
    logo_url?: string | null;
    company_logo?: string | null;
};

type QuotationPrintData = {
    quotation_no?: string | null;
    quotation_date?: string | null;
    expiry_date?: string | null;
    reference?: string | null;
    reference_no?: string | null;
    place_of_supply?: string | null;
    status?: string | null;

    company_name?: string | null;
    company_address?: string | null;
    company_phone?: string | null;
    company_email?: string | null;
    company_gstin?: string | null;
    company_logo?: string | null;

    client_name?: string | null;
    customer_name?: string | null;
    customer?: string | null;
    customer_address?: string | null;
    customer_gstin?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;

    site_name?: string | null;
    location_name?: string | null;
    location_address?: string | null;
    location_map_url?: string | null;
    site_location_map_url?: string | null;
    map_url?: string | null;

    comment?: string | null;
    remarks?: string | null;
    subtotal?: number | string | null;
    total_amount?: number | string | null;
    grand_total?: number | string | null;
    total?: number | string | null;
    total_in_words?: string | null;
    amount_in_words?: string | null;

    items?: QuotationItem[] | null;
};

export type QuotationPrintProps = {
    autoPrint?: boolean;
    quotation: QuotationPrintData;
    company?: QuotationParty;
    client?: QuotationParty;
};

const COMPANY = {
    name: "A S Building Solutions Pvt Ltd",
    address:
        "Vishwa Vimal Complex, Opp. Hyundai Kothari showroom, Next to Tital I Plus Showroom, Magarpatta-Kharadi Road, Kharadi, Pune, 411014, Maharashtra, India",
    gstin: "07AAAAA0000A1Z5 ",
    phone: "1234567890",
    email: "tesing@asbspl.com",
};

const BANK = {
    name: "HDFC Bank OD A/C",
    account: "12345678901234",
    type: "Current",
    branch: "Kalyani Nagar",
    ifsc: "HDFC0000123",
};

const TERMS = [
    {
        title: "Payment Terms",
        lines: [
            "Payment shall be made in favour of A S Building Solutions Pvt Ltd immediately after 30 days of delivery.",
            "Payments not made by the due date will incur interest at 18% per annum.",
            "Cheque returns will attract charges of ₹500 or 2% of the invoice value, whichever is higher.",
        ],
    },
    {
        title: "Delivery Terms",
        lines: [
            "Minimum delivery lead time is 3 days, subject to the mutually agreed delivery schedule.",
            "The minimum order quantity is 100 bags.",
        ],
    },
    {
        title: "Taxes and Duties",
        lines: [
            "Quoted prices are inclusive of 18% GST and transportation charges, provided the minimum order quantity is met.",
            "For orders below the minimum quantity, transportation charges will be extra and calculated at actual cost.",
            "Unloading, if applicable, is the buyer's responsibility and must be arranged and borne by the buyer.",
        ],
    },
    {
        title: "Offer Validity",
        lines: [
            "This offer is valid for 15 days from the date of issuance.",
        ],
    },
];

const formatDate = (value?: string | null): string => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatAmount = (
    value?: number | string | null
): string => {
    const amount = Number(value ?? 0);

    return Number.isFinite(amount)
        ? amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : "0.00";
};

const getValue = (
    ...values: (string | null | undefined)[]
): string => {
    return (
        values.find(
            (value) =>
                typeof value === "string" &&
                value.trim().length > 0
        ) ?? "-"
    );
};

const numberToWords = (value: number): string => {
    if (!Number.isFinite(value) || value < 0) return "-";

    const whole = Math.floor(value + 0.000001);
    const paise = Math.round((value - whole) * 100);

    const belowTwenty = [
        "Zero", "One", "Two", "Three", "Four", "Five",
        "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
        "Twelve", "Thirteen", "Fourteen", "Fifteen",
        "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];

    const tens = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty",
        "Sixty", "Seventy", "Eighty", "Ninety",
    ];

    const underThousand = (n: number): string => {
        let result = "";

        if (n >= 100) {
            result += `${belowTwenty[Math.floor(n / 100)]} Hundred`;
            n %= 100;

            if (n) result += " ";
        }

        if (n >= 20) {
            result += tens[Math.floor(n / 10)];
            n %= 10;

            if (n) result += ` ${belowTwenty[n]}`;
        } else if (n > 0) {
            result += belowTwenty[n];
        }

        return result;
    };

    const toIndianWords = (n: number): string => {
        if (n === 0) return "Zero";

        const parts: string[] = [];

        const crore = Math.floor(n / 10000000);
        n %= 10000000;

        const lakh = Math.floor(n / 100000);
        n %= 100000;

        const thousand = Math.floor(n / 1000);
        n %= 1000;

        if (crore) parts.push(`${underThousand(crore)} Crore`);
        if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
        if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
        if (n) parts.push(underThousand(n));

        return parts.join(" ");
    };

    let words = `${toIndianWords(whole)} Rupees`;

    if (paise > 0) {
        words += ` ${toIndianWords(paise)} Paise`;
    } else {
        words += " Zero Paise";
    }

    return `${words} Only`;
};

const QuotationPrint: React.FC<QuotationPrintProps> = ({
    autoPrint = false,
    quotation,
    company,
    client,
}) => {
    useEffect(() => {
        if (!autoPrint) return;

        const timer = window.setTimeout(() => {
            window.print();
        }, 900);

        return () => window.clearTimeout(timer);
    }, [autoPrint]);

    const items = quotation.items ?? [];

    const companyName = getValue(
        company?.company_name,
        company?.name,
        quotation.company_name,
        COMPANY.name
    );

    const companyAddress = getValue(
        company?.company_address,
        company?.address,
        quotation.company_address,
        COMPANY.address
    );

    const companyPhone = getValue(
        company?.phone,
        company?.contact_number,
        quotation.company_phone,
        COMPANY.phone
    );

    const companyEmail = getValue(
        company?.email,
        quotation.company_email,
        COMPANY.email
    );

    const companyGstin = getValue(
        company?.company_gstin,
        company?.gstin,
        quotation.company_gstin,
        COMPANY.gstin
    );

    const clientName = getValue(
        client?.client_name,
        client?.customer_name,
        client?.name,
        quotation.client_name,
        quotation.customer_name,
        quotation.customer
    );

    const clientAddress = getValue(
        client?.client_address,
        client?.address,
        quotation.customer_address
    );

    const clientPhone = getValue(
        client?.phone,
        client?.contact_number,
        quotation.customer_phone
    );

    const clientEmail = getValue(
        client?.email,
        quotation.customer_email
    );

    const clientGstin = getValue(
        client?.gstin,
        quotation.customer_gstin
    );

    const logoUrl =
        company?.logo_url ||
        company?.company_logo ||
        quotation.company_logo ||
        "";

    const locationName = getValue(
        quotation.location_name,
        quotation.site_name
    );

    const mapUrl =
        quotation.location_map_url ||
        quotation.site_location_map_url ||
        quotation.map_url ||
        "";

    const calculatedTotal = items.reduce((sum, item) => {
        const amount = Number(item.amount);

        if (item.amount != null && Number.isFinite(amount)) {
            return sum + amount;
        }

        return (
            sum +
            Number(item.quantity ?? 0) *
                Number(item.rate_incl_gst ?? item.rate ?? 0)
        );
    }, 0);

    const totalAmount = Number(
        quotation.grand_total ??
            quotation.total_amount ??
            quotation.total ??
            calculatedTotal
    );

    const safeTotal = Number.isFinite(totalAmount) ? totalAmount : 0;

    const totalQuantity = items.reduce(
        (sum, item) => sum + Number(item.quantity ?? 0),
        0
    );

    const totalWords = getValue(
        quotation.total_in_words,
        quotation.amount_in_words
    );

    const amountInWords =
        totalWords === "-"
            ? numberToWords(safeTotal)
            : totalWords;

    return (
        <main className="qp-document">
            {/* Company branding */}
            <header className="qp-header">
                <div className="qp-brand">
                    {logoUrl ? (
                        <img
                            className="qp-logo"
                            src={logoUrl}
                            alt={`${companyName} logo`}
                            onError={(event) => {
                                event.currentTarget.style.display = "none";
                            }}
                        />
                    ) : (
                        <div className="qp-logo-placeholder">
                            <span>AS</span>
                        </div>
                    )}

                    <div className="qp-company">
                        <h1>{companyName}</h1>
                        <p>{companyAddress}</p>

                        <div className="qp-contact-row">
                            <span>GSTIN: {companyGstin}</span>
                            <span>Contact: {companyPhone}</span>
                        </div>

                        <p className="qp-email">{companyEmail}</p>
                    </div>
                </div>

                <div className="qp-document-label">
                    <span className="qp-eyebrow">BUSINESS PROPOSAL</span>
                    <h2>QUOTATION</h2>
                    <span className="qp-number">
                        #{quotation.quotation_no || "-"}
                    </span>
                    {quotation.status && (
                        <span className="qp-status">
                            {quotation.status}
                        </span>
                    )}
                </div>
            </header>

            <div className="qp-accent-bar" />

            {/* Quotation summary */}
            <section className="qp-summary">
                <div>
                    <span className="qp-label">QUOTATION DATE</span>
                    <strong>{formatDate(quotation.quotation_date)}</strong>
                </div>

                <div>
                    <span className="qp-label">EXPIRY DATE</span>
                    <strong>{formatDate(quotation.expiry_date)}</strong>
                </div>

                <div>
                    <span className="qp-label">REFERENCE NO.</span>
                    <strong>
                        {getValue(
                            quotation.reference_no,
                            quotation.reference
                        )}
                    </strong>
                </div>

                <div>
                    <span className="qp-label">PLACE OF SUPPLY</span>
                    <strong>
                        {quotation.place_of_supply || "Maharashtra"}
                    </strong>
                </div>
            </section>

            {/* Billing and site */}
            <section className="qp-parties">
                <div className="qp-panel qp-bill-panel">
                    <div className="qp-section-heading">
                        <span className="qp-section-index">01</span>
                        <h3>Bill To</h3>
                    </div>

                    <h4>{clientName}</h4>

                    {clientAddress !== "-" && (
                        <p className="qp-address">{clientAddress}</p>
                    )}

                    {clientGstin !== "-" && (
                        <p>
                            <strong>GSTIN:</strong> {clientGstin}
                        </p>
                    )}

                    {clientPhone !== "-" && (
                        <p>
                            <strong>Contact:</strong> {clientPhone}
                        </p>
                    )}

                    {clientEmail !== "-" && (
                        <p>
                            <strong>Email:</strong> {clientEmail}
                        </p>
                    )}
                </div>

                <div className="qp-panel qp-site-panel">
                    <div className="qp-section-heading">
                        <span className="qp-section-index">02</span>
                        <h3>Project & Site</h3>
                    </div>

                    <p className="qp-field-label">Customer</p>
                    <h4>
                        {getValue(
                            quotation.customer_name,
                            quotation.customer,
                            clientName
                        )}
                    </h4>

                    <p className="qp-field-label">Site Name</p>
                    <p className="qp-site-value">
                        {getValue(quotation.site_name)}
                    </p>

                    <p className="qp-field-label">Location</p>
                    <p className="qp-site-value">{locationName}</p>

                    {quotation.location_address && (
                        <p className="qp-address">
                            {quotation.location_address}
                        </p>
                    )}

                    {mapUrl && (
                        <a
                            className="qp-map-link"
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View Site Map ↗
                        </a>
                    )}
                </div>
            </section>

            {/* Item details */}
            <section className="qp-items-section">
                <div className="qp-section-heading qp-items-heading">
                    <span className="qp-section-index">03</span>
                    <h3>Quotation Details</h3>
                </div>

                <table className="qp-items-table">
                    <thead>
                        <tr>
                            <th className="qp-col-no">#</th>
                            <th className="qp-col-product">
                                Item & Description
                            </th>
                            <th>Product Code</th>
                            <th>HSN/SAC</th>
                            <th>Unit</th>
                            <th className="qp-numeric">Qty</th>
                            <th className="qp-numeric">Rate (₹)</th>
                            <th className="qp-numeric">Amount (₹)</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.length > 0 ? (
                            items.map((item, index) => {
                                const quantity = Number(
                                    item.quantity ?? 0
                                );

                                const rate = Number(
                                    item.rate_incl_gst ??
                                        item.rate ??
                                        0
                                );

                                const rawAmount =
                                    item.amount != null
                                        ? Number(item.amount)
                                        : quantity * rate;

                                const amount = Number.isFinite(rawAmount)
                                    ? rawAmount
                                    : quantity * rate;

                                return (
                                    <tr key={item.id ?? index}>
                                        <td className="qp-col-no">
                                            {String(index + 1).padStart(2, "0")}
                                        </td>

                                        <td className="qp-product-cell">
                                            <strong>
                                                {item.product_name || "-"}
                                            </strong>

                                            {item.description && (
                                                <p className="qp-product-description">
                                                    {item.description}
                                                </p>
                                            )}
                                        </td>

                                        <td>{item.product_code || "-"}</td>
                                        <td>{item.hsn_sac || "-"}</td>
                                        <td>{item.unit || "-"}</td>

                                        <td className="qp-numeric">
                                            {formatAmount(quantity)}
                                        </td>

                                        <td className="qp-numeric">
                                            {formatAmount(rate)}
                                        </td>

                                        <td className="qp-numeric qp-line-amount">
                                            {formatAmount(amount)}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="qp-empty-row"
                                >
                                    No quotation items available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            {/* Totals */}
            <section className="qp-total-layout">
                <div className="qp-words-panel">
                    <span className="qp-label">TOTAL AMOUNT IN WORDS</span>
                    <p>{amountInWords}</p>
                    <span className="qp-inclusive-note">
                        Prices are inclusive of applicable GST as quoted.
                    </span>
                </div>

                <div className="qp-total-card">
                    <div className="qp-total-row">
                        <span>Total Quantity</span>
                        <strong>{formatAmount(totalQuantity)}</strong>
                    </div>

                    <div className="qp-total-row qp-grand-total">
                        <span>Grand Total</span>
                        <strong>₹ {formatAmount(safeTotal)}</strong>
                    </div>

                    <div className="qp-gst-note">
                        GST inclusive
                    </div>
                </div>
            </section>

            {/* Customer note */}
            <div className="qp-thank-you">
                <span className="qp-thank-you-icon">✦</span>
                <div>
                    <strong>Looking forward to your business.</strong>
                    <p>
                        Thank you for considering A S Building Solutions
                        for your project.
                    </p>
                </div>
            </div>

            {(quotation.comment || quotation.remarks) && (
                <section className="qp-remarks">
                    <h3>Additional Remarks</h3>
                    <p>{quotation.comment || quotation.remarks}</p>
                </section>
            )}

            {/* Bank details and signature */}
            <section className="qp-bottom-grid">
                <div className="qp-bank-panel">
                    <div className="qp-section-heading">
                        <span className="qp-section-index">04</span>
                        <h3>Bank Details</h3>
                    </div>

                    <div className="qp-bank-row">
                        <span>Bank</span>
                        <strong>{BANK.name}</strong>
                    </div>

                    <div className="qp-bank-row">
                        <span>Account No.</span>
                        <strong>{BANK.account}</strong>
                    </div>

                    <div className="qp-bank-row">
                        <span>Account Type</span>
                        <strong>{BANK.type}</strong>
                    </div>

                    <div className="qp-bank-row">
                        <span>Branch</span>
                        <strong>{BANK.branch}</strong>
                    </div>

                    <div className="qp-bank-row">
                        <span>IFSC Code</span>
                        <strong>{BANK.ifsc}</strong>
                    </div>
                </div>

                <div className="qp-signature-panel">
                    <p>For</p>
                    <h4>{companyName}</h4>

                    <div className="qp-signature-space" />

                    <div className="qp-signature-line" />
                    <strong>Authorized Signature</strong>
                    <span>Company Stamp</span>
                </div>
            </section>

            {/* Terms */}
            <section className="qp-terms">
                <div className="qp-section-heading">
                    <span className="qp-section-index">05</span>
                    <h3>Terms & Conditions</h3>
                </div>

                <div className="qp-terms-grid">
                    {TERMS.map((term) => (
                        <div className="qp-term" key={term.title}>
                            <h4>{term.title}</h4>

                            <ul>
                                {term.lines.map((line, index) => (
                                    <li key={index}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="qp-footer">
                <strong>A S Building Solutions Pvt Ltd</strong>
                <span>Thank you for your trust.</span>
                <span>{COMPANY.email} · {COMPANY.phone}</span>
            </footer>
        </main>
    );
};

export default QuotationPrint;
