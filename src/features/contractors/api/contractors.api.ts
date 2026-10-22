import apiClient from "../../../api/client";

export interface Contractor {
    id: number;
    name: string;
    phone: string;
    email: string;
    address_line1: string;
    address_line2: string | null;
    location: string;
    state: string;
    city: string;
    pin_code: string;
    pan_card: string;
    pan_card_document: string;
    aadhaar_card: string;
    aadhaar_card_document: string;
    payment_upi: string;
    account_name: string;
    account_number: string;
    ifsc_code: string;
    status: "Active" | "Inactive";
    created_at?: string;
}

export type ContractorInput = Omit<
    Contractor,
    | "id"
    | "created_at"
    | "pan_card_document"
    | "aadhaar_card_document"
> & {
    pan_card_document: File | null;
    aadhaar_card_document: File | null;
};

export interface ContractorListResult {
    rows: Array<
        Pick<
            Contractor,
            | "id"
            | "name"
            | "phone"
            | "email"
            | "address_line1"
            | "address_line2"
            | "location"
            | "city"
            | "state"
            | "pin_code"
            | "status"
        >
    >;
    total: number;
    page: number;
    limit: number;
}

type ApiResponse<T> = {
    success: boolean;
    message?: string;
    data: T;
};

/**
 * Converts contractor form values into multipart FormData.
 * Existing document paths are not uploaded as files.
 * Only newly selected File objects are appended as documents.
 */
function toFormData(input: ContractorInput): FormData {
    const formData = new FormData();

    Object.entries(input).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            return;
        }

        if (value instanceof File) {
            formData.append(key, value);
            return;
        }

        formData.append(key, String(value));
    });

    return formData;
}

/**
 * Get paginated contractors.
 */
export async function getContractors(params: {
    page: number;
    limit: number;
    search: string;
    status: string;
}) {
    const response = await apiClient.get(
        "api/contractors",
        { params }
    );

    return response.data;
}

/**
 * Get one contractor by ID.
 */
export async function getContractor(id: number) {
    const response = await apiClient.get<ApiResponse<Contractor>>(
        `api/contractors/${id}`
    );

    return response.data.data;
}

/**
 * Create contractor.
 */
export async function createContractor(
    input: ContractorInput
) {
    const formData = toFormData(input);

    const response = await apiClient.post<ApiResponse<Contractor>>(
        "api/contractors",
        formData
    );

    return response.data.data;
}

/**
 * Update contractor.
 */
export async function updateContractor(
    id: number,
    input: ContractorInput
) {
    const formData = toFormData(input);

    const response = await apiClient.put<ApiResponse<Contractor>>(
        `api/contractors/${id}`,
        formData
    );

    return response.data.data;
}

/**
 * Update contractor status.
 */
export async function updateContractorStatus(
    id: number,
    status: "Active" | "Inactive"
) {
    const response = await apiClient.patch<ApiResponse<Contractor>>(
        `api/contractors/${id}/status`,
        { status }
    );

    return response.data.data;
}

/**
 * Delete contractor.
 */
export async function deleteContractor(id: number) {
    await apiClient.delete(`api/contractors/${id}`);
}
