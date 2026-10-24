import apiClient from "../../../api/client";

export type ProductStatus = "Active" | "Inactive";

export interface Product {
    id: number;
    product_code: string;
    product_name: string;
    unit: string;
    product_description: string;
    hsn_code: string;
    standard_rate: number | string;
    status: ProductStatus;
    product_image: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ProductInput {
    product_code: string;
    product_name: string;
    unit: string;
    product_description: string;
    hsn_code: string;
    standard_rate: number;
    product_image: File | null;
}

export interface ProductPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface ProductResponse {
    success: boolean;
    message?: string;
    data: Product;
}

interface ProductListResponse {
    success: boolean;
    data: Product[];
    pagination: ProductPagination;
}

function createFormData(input: ProductInput): FormData {
    const formData = new FormData();

    formData.append("product_code", input.product_code);
    formData.append("product_name", input.product_name);
    formData.append("unit", input.unit);
    formData.append(
        "product_description",
        input.product_description
    );
    formData.append("hsn_code", input.hsn_code);
    formData.append(
        "standard_rate",
        String(input.standard_rate)
    );

    if (input.product_image) {
        formData.append("product_image", input.product_image);
    }

    return formData;
}

export async function getProducts(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
}) {
    const response =
        await apiClient.get<ProductListResponse>(
            "api/products",
            { params }
        );

    return response.data;
}

export async function getProduct(id: number): Promise<Product> {
    const response =
        await apiClient.get<ProductResponse>(
            `api/products/${id}`
        );

    return response.data.data;
}

export async function createProduct(
    input: ProductInput
): Promise<Product> {
    const response =
        await apiClient.post<ProductResponse>(
            "api/products",
            createFormData(input)
        );

    return response.data.data;
}

export async function updateProduct(
    id: number,
    input: ProductInput
): Promise<Product> {
    const response =
        await apiClient.put<ProductResponse>(
            `api/products/${id}`,
            createFormData(input)
        );

    return response.data.data;
}

export async function updateProductStatus(
    id: number,
    status: ProductStatus
): Promise<Product> {
    const response =
        await apiClient.patch<ProductResponse>(
            `api/products/${id}/status`,
            { status }
        );

    return response.data.data;
}

export async function deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`api/products/${id}`);
}