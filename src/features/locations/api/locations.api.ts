import apiClient from "../../../api/client";

export interface Location {
    id: number;
    location_name: string;
    created_at: string;
    updated_at: string;
}

export interface LocationPayload {
    locationName: string;
}

export interface LocationListResponse {
    success: boolean;
    message: string;
    data: Location[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface LocationResponse {
    success: boolean;
    message: string;
    data: Location;
}

interface MessageResponse {
    success: boolean;
    message: string;
}

export interface LocationListParams {
    page?: number;
    limit?: number;
    search?: string;
}

export const getLocations = async (
    params: LocationListParams = {}
): Promise<LocationListResponse> => {
    const response = await apiClient.get("api/locations", { params });
    return response.data;
};

export const getLocation = async (
    id: number
): Promise<Location> => {
    const response = await apiClient.get<LocationResponse>(
        `api/locations/${id}`
    );
    return response.data.data;
};

export const createLocation = async (
    payload: LocationPayload
): Promise<Location> => {
    const response = await apiClient.post<LocationResponse>(
        "api/locations",
        payload
    );
    return response.data.data;
};

export const updateLocation = async (
    id: number,
    payload: LocationPayload
): Promise<Location> => {
    const response = await apiClient.put<LocationResponse>(
        `api/locations/${id}`,
        payload
    );
    return response.data.data;
};

export const deleteLocation = async (
    id: number
): Promise<string> => {
    const response = await apiClient.delete<MessageResponse>(
        `api/locations/${id}`
    );
    return response.data.message;
};