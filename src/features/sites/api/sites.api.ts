import apiClient from "../../../api/client";

export type SiteLocationMode =
    | "na"
    | "manual"
    | "map_link"
    | "gps"
    | "vehicle_tracking";

export interface Site {
    id: number;
    site_name: string;
    customer_id: number;
    customer_name?: string | null;
    location_id: number;
    location_name?: string | null;
    contact_person?: string | null;
    contact_number?: string | null;
    line_1?: string | null;
    line_2?: string | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    pin_code?: string | null;

    site_location_mode?: SiteLocationMode | null;
    site_location_name?: string | null;
    site_location_address?: string | null;
    site_location_latitude?: number | string | null;
    site_location_longitude?: number | string | null;
    site_location_map_url?: string | null;
    vehicle_tracking_reference?: string | null;

    created_at?: string;
    updated_at?: string;
}

export interface SiteInput {
    site_name: string;
    customer_id: number;
    location_id: number;
    contact_person: string;
    contact_number: string;
    line_1: string;
    line_2: string;
    country: string;
    state: string;
    city: string;
    pin_code: string;

    site_location_mode: SiteLocationMode;
    site_location_name: string;
    site_location_address: string;
    site_location_latitude: number | null;
    site_location_longitude: number | null;
    site_location_map_url: string;
    vehicle_tracking_reference: string;
}

export interface SitePagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface GetSitesParams {
    page?: number;
    limit?: number;
    search?: string;
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

function getErrorMessage(error: unknown, fallback: string): string {
    const value = error as {
        response?: { data?: { message?: string } };
        message?: string;
    };

    return value.response?.data?.message || value.message || fallback;
}

function unwrapObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") return {};
    return value as Record<string, unknown>;
}

export async function getSites(params: GetSitesParams = {}) {
    try {
        const page = params.page ?? 1;
        const limit = params.limit ?? 10;
        const response = await apiClient.get("api/sites", {
            params: {
                page,
                limit,
                search: params.search ?? "",
            },
        });

        const body = unwrapObject(response.data);
        const dataObject = unwrapObject(body.data);
        const rows = Array.isArray(body.data)
            ? body.data
            : Array.isArray(dataObject.rows)
              ? dataObject.rows
              : Array.isArray(dataObject.sites)
                ? dataObject.sites
                : Array.isArray(dataObject.data)
                  ? dataObject.data
                  : [];

        const pagination = unwrapObject(body.pagination ?? dataObject.pagination);
        const total = Number(pagination.total ?? rows.length);
        const responsePage = Number(pagination.page ?? page);
        const responseLimit = Number(pagination.limit ?? limit);
        const totalPages = Number(
            pagination.totalPages ?? pagination.total_pages ?? Math.max(1, Math.ceil(total / responseLimit)),
        );

        return {
            success: body.success !== false,
            data: rows as Site[],
            pagination: {
                page: responsePage,
                limit: responseLimit,
                total,
                totalPages: Math.max(1, totalPages),
            } satisfies SitePagination,
        };
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to load sites."));
    }
}

export async function getSite(id: number): Promise<Site> {
    try {
        const response = await apiClient.get<ApiResponse<Site>>(`api/sites/${id}`);
        if (response.data?.success === false || !response.data?.data) {
            throw new Error(response.data?.message || "Site details were not returned by the server.");
        }
        return response.data.data;
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to load site details."));
    }
}

export async function createSite(input: SiteInput): Promise<Site> {
    try {
        const response = await apiClient.post<ApiResponse<Site>>("api/sites", input);
        if (response.data?.success === false || !response.data?.data) {
            throw new Error(response.data?.message || "The site was not created.");
        }
        return response.data.data;
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to create site."));
    }
}

export async function updateSite(id: number, input: SiteInput): Promise<Site> {
    try {
        const response = await apiClient.put<ApiResponse<Site>>(`api/sites/${id}`, input);
        if (response.data?.success === false || !response.data?.data) {
            throw new Error(response.data?.message || "The site was not updated.");
        }
        return response.data.data;
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to update site."));
    }
}

export async function deleteSite(id: number): Promise<void> {
    try {
        const response = await apiClient.delete<ApiResponse<unknown>>(`api/sites/${id}`);
        if (response.data?.success === false) {
            throw new Error(response.data?.message || "The site was not deleted.");
        }
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to delete site."));
    }
}
