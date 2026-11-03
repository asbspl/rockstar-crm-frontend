
import apiClient from "../../../api/client";

export interface Activity {
    id: string;
    user_id: string | null;
    user_name: string | null;
    user_email: string | null;
    action: string;
    module: string;
    entity_type: string | null;
    record_id: string | null;
    description: string | null;
    old_values: Record<string, unknown> | string | null;
    new_values: Record<string, unknown> | string | null;
    resolved_old_values?: Record<string, unknown> | string | null;
    resolved_new_values?: Record<string, unknown> | string | null;
    ip_address: string | null;
    user_agent: string | null;
    request_method: string | null;
    request_url: string | null;
    status: string;
    created_at: string;
}

export interface ActivityFilters {
    page?: number;
    limit?: number;
    search?: string;
    user_id?: string;
    entity_id?: string;
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
    total_activities: number | string;
    today_activities: number | string;
    failed_activities: number | string;
    active_users: number | string;
}

export interface ActivityListResponse {
    success: boolean;
    message: string;
    data: {
        rows: Activity[];
        pagination: ActivityPagination;
    };
}

export interface ActivityFilterOptions {
    actions: string[];
    modules: string[];
    users: Array<{
        user_id: string;
        user_name: string | null;
        user_email: string | null;
    }>;
}

export const getActivities = async (
    filters: ActivityFilters = {}
): Promise<ActivityListResponse> => {
    const response = await apiClient.get("api/activity", {
        params: filters,
    });

    const data = response.data?.data;
    const rows = data?.activities ?? data?.rows;

    if (!Array.isArray(rows) || !data?.pagination) {
        throw new Error("Activity API returned an invalid response.");
    }

    return {
        ...response.data,
        data: {
            rows,
            pagination: data.pagination,
        },
    };
};

export const getActivityById = async (
    id: number | string
): Promise<Activity> => {
    const response = await apiClient.get(`api/activity/${id}`);

    return response.data.data;
};

export const getActivitySummary = async (): Promise<ActivitySummary> => {
    const response = await apiClient.get("api/activity/summary");

    return response.data.data;
};

export const getActivityFilters = async (): Promise<ActivityFilterOptions> => {
    const response = await apiClient.get("api/activity/filters");
    const filters = response.data?.data;

    if (
        !filters ||
        !Array.isArray(filters.actions) ||
        !Array.isArray(filters.modules) ||
        !Array.isArray(filters.users)
    ) {
        throw new Error("Activity API returned invalid filter options.");
    }

    return filters;
};

export const recordActivityExport = async (): Promise<void> => {
    await apiClient.post("api/activity/export");
};
