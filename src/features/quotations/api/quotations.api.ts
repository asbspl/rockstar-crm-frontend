
import apiClient from "../../../api/client";

export type QuotationStatus =
    | "Draft"
    | "Send"
    | "Approved"
    | "Declined";

export type QuotationLocationMode =
    | "na"
    | "manual"
    | "map_link"
    | "gps"
    | "vehicle_tracking";

export type QuotationItemInput = {
    product_id: number;
    unit: string;
    quantity: number;
    rate_incl_gst: number;
};

export type QuotationInput = {
    company_id: number;
    client_id: number;
    customer_id: number | null;
    site_id: number | null;
    location_id: number | null;
    quotation_date: string;
    expiry_date: string;
    reference: string;
    comment: string;
    items: QuotationItemInput[];
};

export type QuotationItem = QuotationItemInput & {
    id: number;
    amount: number | string;
    product_name: string;
};

export type Quotation = {
    id: number;
    quotation_no: string;
    company_id: number;
    client_id: number;
    customer_id: number | null;
    site_id: number | null;
    location_id: number | null;

    quotation_date: string;
    expiry_date: string;
    reference: string;
    comment: string;

    total_amount: number | string;
    grand_total: number | string;
    status: QuotationStatus;

    // Company details
    company_name: string;
    company_address?: string | null;
    company_gstin?: string | null;
    company_phone?: string | null;
    company_email?: string | null;
    company_logo?: string | null;

    // Client details
    client_name: string;
    client_address?: string | null;
    client_gstin?: string | null;
    client_phone?: string | null;
    client_email?: string | null;

    // Customer details
    customer_name: string;
    customer_address?: string | null;
    customer_gstin?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;

    // Site details
    site_name: string;
    site_address?: string | null;

    // Selected quotation location
    location_name?: string | null;
    location_mode?: string | null;
    location_address?: string | null;
    location_latitude?: number | string | null;
    location_longitude?: number | string | null;
    location_map_url?: string | null;
    vehicle_tracking_reference?: string | null;

    // Optional site location fallback
    site_location_name?: string | null;
    site_location_address?: string | null;
    site_location_latitude?: number | string | null;
    site_location_longitude?: number | string | null;
    site_location_map_url?: string | null;

    // Additional print details
    reference_no?: string | null;
    place_of_supply?: string | null;
    remarks?: string | null;

    // Quotation items
    items?: QuotationItem[];
};

export type QuotationListResult = {
    data: Quotation[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};

export async function getQuotations(params: {
    page: number;
    limit: number;
    search: string;
    status?: string;
}): Promise<QuotationListResult> {
    const response = await apiClient.get("api/quotations", {
        params,
    });

    return {
        data: response.data.data ?? [],
        pagination: response.data.pagination ?? {
            page: params.page,
            limit: params.limit,
            total: 0,
            totalPages: 1,
        },
    };
}

export async function getQuotation(id: number): Promise<Quotation> {
    const response = await apiClient.get(`api/quotations/${id}`);
    return response.data.data;
}

function normalizeOptionalId(value: number | null | undefined) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeQuotationInput(input: QuotationInput): QuotationInput {
    return {
        ...input,
        customer_id: normalizeOptionalId(input.customer_id),
        site_id: normalizeOptionalId(input.site_id),
        location_id: normalizeOptionalId(input.location_id),
    };
}

export async function createQuotation(input: QuotationInput) {
    return apiClient.post(
        "api/quotations",
        normalizeQuotationInput(input),
    );
}

export async function updateQuotation(
    id: number,
    input: QuotationInput,
) {
    return apiClient.put(
        `api/quotations/${id}`,
        normalizeQuotationInput(input),
    );
}

export async function updateQuotationStatus(
    id: number,
    status: QuotationStatus,
) {
    return apiClient.patch(`api/quotations/${id}/status`, {
        status,
    });
}

export async function deleteQuotation(id: number) {
    return apiClient.delete(`api/quotations/${id}`);
}

export async function sendQuotationEmail(id: number) {
    return apiClient.post(`api/quotations/${id}/send-email`);
}
