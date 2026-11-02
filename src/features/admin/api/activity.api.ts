
import apiClient from "../../../api/client";

export interface Activity {
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    action: string;
    module: string;
    record_id: string | null;
    description: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    request_method: string | null;
    request_url: string | null;
    status: string;
    error_message: string | null;
    created_at: string;
}

export interface ActivityFilters {
    page?: number;
    limit?: number;
    search?: string;
    user_id?: string;
    action?: string;
    module?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
}

export interface ActivityPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ActivitySummary {
    total_activities: number;
    today_activities: number;
    failed_activities: number;
    active_users: number;
}

export interface ActivityListResponse {
    success: boolean;
    message: string;
    data: {
        rows: Activity[];
        pagination: ActivityPagination;
    };
}

export const getActivities = async (
    filters: ActivityFilters = {}
): Promise<ActivityListResponse> => {
    const response = await apiClient.get("api/activity", {
        params: filters,
    });

    return response.data;
};

export const getActivityById = async (
    id: number
): Promise<Activity> => {
    const response = await apiClient.get(`api/activity/${id}`);

    return response.data.data;
};

export const getActivitySummary = async (): Promise<ActivitySummary> => {
    const response = await apiClient.get("api/activity/summary");

    return response.data.data;
};

export const getActivityFilters = async () => {
    const response = await apiClient.get("api/activity/filters");

    return response.data.data;
};
