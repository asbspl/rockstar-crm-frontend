import apiClient from "../../../api/client";

export type CustomerStatus = "Active" | "Hold" | "Close";

export type CustomerLocationMode =
    | "na"
    | "manual"
    | "map_link"
    | "gps"
    | "vehicle_tracking";

export interface Customer {
    id: number;

    customer_name: string;
    client_id: number | null;
    location_id: number | null;

    phone: string;
    email: string;
    address_line1: string;
    address_line2: string;
    country: string;
    state: string;
    city: string;
    pin_code: string;
    contact_person: string;
    status: string;
    under_employee_id: number | null;

    location_name?: string;
    location_mode?: CustomerLocationMode;
    location_address?: string;
    location_latitude?: number | string | null;
    location_longitude?: number | string | null;
    location_map_url?: string;
    vehicle_tracking_reference?: string;

    visiting_card_front: string | null;
    visiting_card_back: string | null;
    shop_front: string | null;
    shop_back: string | null;

    created_at?: string;
    updated_at?: string;
}

export interface CustomerInput {
    customer_name: string;
    client_id: number | null;
    location_id: number | null;

    phone: string;
    email: string;
    address_line1: string;
    address_line2: string;
    country: string;
    state: string;
    city: string;
    pin_code: string;
    contact_person: string;
    status: string;
    under_employee_id: number | null;

    location_name: string;
    location_mode: CustomerLocationMode;
    location_address: string;
    location_latitude: number | null;
    location_longitude: number | null;
    location_map_url: string;
    vehicle_tracking_reference: string;

    visiting_card_front: File | null;
    visiting_card_back: File | null;
    shop_front: File | null;
    shop_back: File | null;
}

export type CustomerPayload = CustomerInput;

export interface CustomerListResponse {
    success: boolean;
    message: string;
    data: Customer[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

function buildCustomerFormData(
    payload: Partial<CustomerPayload>
): FormData {
    const formData = new FormData();

    const documentFields = [
        "visiting_card_front",
        "visiting_card_back",
        "shop_front",
        "shop_back",
    ] as const;

    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined) return;

        if (
            documentFields.includes(
                key as (typeof documentFields)[number]
            )
        ) {
            if (value instanceof File) {
                formData.append(key, value);
            }

            // Do not send empty document fields during updates.
            return;
        }

        if (value === null) {
            formData.append(key, "");
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


export async function getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}) {
    const response = await apiClient.get<CustomerListResponse>(
        "api/customers",
        { params }
    );

    return response.data;
}

export async function getCustomer(id: number): Promise<Customer> {
    const response = await apiClient.get<{
        success: boolean;
        data: Customer;
    }>(`api/customers/${id}`);

    return response.data.data;
}

export async function createCustomer(payload: CustomerPayload) {
    const response = await apiClient.post(
        "api/customers",
        buildCustomerFormData(payload)
    );

    return response.data;
}

export async function updateCustomer(
    id: number,
    payload: Partial<CustomerPayload>
) {
    const response = await apiClient.put(
        `api/customers/${id}`,
        buildCustomerFormData(payload)
    );

    return response.data;
}

/**
 * Updates status through the existing customer update endpoint.
 * This does not require a separate status route.
 */
export async function updateCustomerStatus(
    id: number,
    status: CustomerStatus
) {
    return updateCustomer(id, { status } as Partial<CustomerPayload>);
}

export async function deleteCustomer(id: number) {
    const response = await apiClient.delete(`api/customers/${id}`);
    return response.data;
}
