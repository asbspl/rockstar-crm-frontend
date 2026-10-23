import apiClient from "../../../api/client";

export type ClientStatus = "Active" | "Hold" | "Close";

export type ClientLocationMode =
    | "na"
    | "manual"
    | "map_link"
    | "gps"
    | "vehicle_tracking";

export interface Client {
    id: number;
    client_code: string | null;
    client_name: string;
    client_phone: string;
    client_email: string;
    address_line1: string;
    address_line2: string | null;
    country: string;
    state: string;
    city: string;
    pin_code: string;
    location_name: string | null;
    location_mode: ClientLocationMode;
    location_address: string | null;
    location_latitude: number | string | null;
    location_longitude: number | string | null;
    location_map_url: string | null;
    vehicle_tracking_reference: string | null;
    client_addition_date: string;
    client_gstin: string;
    contact_person: string;
    client_status: ClientStatus;
    credit_days: number;
    under_employee_id: number | null;
    delivery_challan_provided: boolean;
    gst_document_path: string | null;
    pan_number: string | null;
    pan_document_path: string | null;
    aadhaar_number: string | null;
    aadhaar_document_path: string | null;
    dealer_registration_number: string | null;
    dealer_registration_document_path: string | null;
    visiting_card_front: string | null;
    visiting_card_back: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ClientInput {
    client_name: string;
    client_phone: string;
    client_code: string;
    client_email: string;
    address_line1: string;
    address_line2: string;
    country: string;
    state: string;
    city: string;
    pin_code: string;

    location_name: string;
    location_mode: ClientLocationMode;
    location_address: string;
    location_latitude: number | null;
    location_longitude: number | null;
    location_map_url: string;
    vehicle_tracking_reference: string;

    client_addition_date: string;
    client_gstin: string;
    contact_person: string;
    client_status: ClientStatus;
    credit_days: number;
    under_employee_id: number | null;
    delivery_challan_provided: boolean;

    pan_number: string;
    aadhaar_number: string;
    dealer_registration_number: string;

    gst_document: File | null;
    pan_document: File | null;
    aadhaar_document: File | null;
    dealer_registration_document: File | null;
    visiting_card_front: File | null;
    visiting_card_back: File | null;

}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

interface ClientListResponse {
    success: boolean;
    data: Client[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

function createFormData(input: ClientInput): FormData {
    const formData = new FormData();

    Object.entries(input).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (value instanceof File) {
            formData.append(key, value);
        } else {
            formData.append(key, String(value));
        }
    });

    return formData;
}

export async function getClients(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
}) {
    const response = await apiClient.get<ClientListResponse>(
        "api/clients",
        { params }
    );

    return response.data;
}

export async function getClient(id: number): Promise<Client> {
    const response = await apiClient.get<ApiResponse<Client>>(
        `api/clients/${id}`
    );

    return response.data.data;
}

export async function createClient(
    input: ClientInput
): Promise<Client> {
    const response = await apiClient.post<ApiResponse<Client>>(
        "api/clients",
        createFormData(input)
    );

    return response.data.data;
}

export async function updateClient(
    id: number,
    input: ClientInput
): Promise<Client> {
    const response = await apiClient.put<ApiResponse<Client>>(
        `api/clients/${id}`,
        createFormData(input)
    );

    return response.data.data;
}

export async function updateClientStatus(
    id: number,
    status: ClientStatus
): Promise<Client> {
    const response = await apiClient.patch<ApiResponse<Client>>(
        `api/clients/${id}/status`,
        { status }
    );

    return response.data.data;
}

export async function deleteClient(id: number): Promise<void> {
    await apiClient.delete(`api/clients/${id}`);
}