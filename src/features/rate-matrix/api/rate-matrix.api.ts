import apiClient from "../../../api/client";

export interface RateMatrix {
    id: number;
    client_id: number | string;
    client_name: string;

    customer_id: number | string;
    customer_name: string;

    site_id: number | string;
    customer_site_name: string;

    location_id: number | string;
    location_name: string;

    product_id: number | string;
    product_code?: string;
    product_name: string;

    rate: number | string;

    created_at?: string;
    updated_at?: string;
}

export interface RateMatrixInput {
    client_id: number;
    customer_id: number;
    site_id: number;
    location_id: number;
    product_id: number;
    rate: number;
}

export interface RateMatrixPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface RateMatrixResponse {
    success: boolean;
    message?: string;
    data: RateMatrix;
}

interface RateMatrixListResponse {
    success: boolean;
    data: RateMatrix[];
    pagination: RateMatrixPagination;
}

export async function getRateMatrices(params: {
    page: number;
    limit: number;
    search?: string;
}) {
    const response =
        await apiClient.get<RateMatrixListResponse>(
            "api/rate-matrix",
            { params }
        );

    return response.data;
}

export async function getRateMatrix(
    id: number
): Promise<RateMatrix> {
    const response =
        await apiClient.get<RateMatrixResponse>(
            `api/rate-matrix/${id}`
        );

    return response.data.data;
}

export async function createRateMatrix(
    input: RateMatrixInput
): Promise<RateMatrix> {
    const response =
        await apiClient.post<RateMatrixResponse>(
            "api/rate-matrix",
            input
        );

    return response.data.data;
}

export async function updateRateMatrix(
    id: number,
    input: RateMatrixInput
): Promise<RateMatrix> {
    const response =
        await apiClient.put<RateMatrixResponse>(
            `api/rate-matrix/${id}`,
            input
        );

    return response.data.data;
}

export async function deleteRateMatrix(
    id: number
): Promise<void> {
    await apiClient.delete(`api/rate-matrix/${id}`);
}