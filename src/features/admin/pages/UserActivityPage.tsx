
import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
} from "react";

import {
    getActivities,
    getActivityById,
    getActivitySummary,
    type Activity,
    type ActivityFilters,
    type ActivityPagination,
    type ActivitySummary,
} from "../api/activity.api";

import ActivityDetails from "../components/ActivityDetails";

import "../styles/user-activity.css";

const INITIAL_SUMMARY: ActivitySummary = {
    total_activities: 0,
    today_activities: 0,
    failed_activities: 0,
    active_users: 0,
};

function UserActivityPage() {
    const [activities, setActivities] = useState<Activity[]>([]);

    const [summary, setSummary] =
        useState<ActivitySummary>(INITIAL_SUMMARY);

    const [pagination, setPagination] =
        useState<ActivityPagination>({
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 0,
        });

    const [search, setSearch] = useState("");
    const [action, setAction] = useState("");
    const [module, setModule] = useState("");
    const [status, setStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [selectedActivity, setSelectedActivity] =
        useState<Activity | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadSummary = useCallback(async () => {
        try {
            const result = await getActivitySummary();
            setSummary(result);
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to load activity summary.",
            );
        }
    }, []);

    const loadActivities = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const filters: ActivityFilters = {
                page: pagination.page,
                limit: pagination.limit,
                search: search.trim(),
                action,
                module,
                status,
                start_date: startDate,
                end_date: endDate,
            };

            const result = await getActivities(filters);

            setActivities(result.data.rows);
            setPagination(result.data.pagination);
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to load user activities.",
            );
        } finally {
            setLoading(false);
        }
    }, [
        pagination.page,
        pagination.limit,
        search,
        action,
        module,
        status,
        startDate,
        endDate,
    ]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    const updateFilter = (
        setter: (value: string) => void,
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setter(event.target.value);

        setPagination((previous) => ({
            ...previous,
            page: 1,
        }));
    };

    const openDetails = async (id: number) => {
        try {
            const result = await getActivityById(id);
            setSelectedActivity(result);
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to load activity details.",
            );
        }
    };

    const exportCSV = () => {
        const headers = [
            "ID",
            "User",
            "Email",
            "Action",
            "Module",
            "Record ID",
            "Description",
            "Status",
            "IP Address",
            "Date",
        ];

        const escapeCSV = (value: unknown) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const rows = activities.map((item) => [
            item.id,
            item.user_name,
            item.user_email,
            item.action,
            item.module,
            item.record_id,
            item.description,
            item.status,
            item.ip_address,
            new Date(item.created_at).toISOString(),
        ]);

        const csv = [
            headers,
            ...rows,
        ].map((row) => row.map(escapeCSV).join(",")).join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "rockstar-crm-activity.csv";
        link.click();

        URL.revokeObjectURL(url);
    };

    const resetFilters = () => {
        setSearch("");
        setAction("");
        setModule("");
        setStatus("");
        setStartDate("");
        setEndDate("");

        setPagination((previous) => ({
            ...previous,
            page: 1,
        }));
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusClass = (value: string) => {
        return value.toLowerCase() === "success"
            ? "success"
            : "failed";
    };

    return (
        <div className="user-activity-page">

            <div className="activity-page-header">
                <div>
                    <h1>User Activity</h1>

                    <p>
                        Monitor user actions, system activities
                        and audit history.
                    </p>
                </div>

                <button
                    className="activity-export-button"
                    onClick={exportCSV}
                    disabled={activities.length === 0}
                >
                    ↓ Export CSV
                </button>
            </div>

            <div className="activity-summary-grid">

                <div className="activity-summary-card">
                    <span>Total Activities</span>
                    <strong>
                        {Number(summary.total_activities).toLocaleString("en-IN")}
                    </strong>
                    <small>All recorded actions</small>
                </div>

                <div className="activity-summary-card">
                    <span>Today's Activities</span>
                    <strong>
                        {Number(summary.today_activities).toLocaleString("en-IN")}
                    </strong>
                    <small>Actions recorded today</small>
                </div>

                <div className="activity-summary-card">
                    <span>Active Users Today</span>
                    <strong>
                        {Number(summary.active_users).toLocaleString("en-IN")}
                    </strong>
                    <small>Distinct users with activity</small>
                </div>

                <div className="activity-summary-card">
                    <span>Failed Activities Today</span>
                    <strong className="activity-danger">
                        {Number(summary.failed_activities).toLocaleString("en-IN")}
                    </strong>
                    <small>Recorded failed events</small>
                </div>

            </div>

            <div className="activity-table-container">

                <div className="activity-toolbar">
                    <div>
                        <h2>Activity History</h2>
                        <p>Review and investigate user actions.</p>
                    </div>

                    <button
                        className="activity-refresh-button"
                        onClick={() => {
                            loadActivities();
                            loadSummary();
                        }}
                        disabled={loading}
                    >
                        ↻ Refresh
                    </button>
                </div>

                <div className="activity-filters">

                    <input
                        type="search"
                        placeholder="Search user, module, record..."
                        value={search}
                        onChange={(event) =>
                            updateFilter(setSearch, event)
                        }
                    />

                    <select
                        value={action}
                        onChange={(event) =>
                            updateFilter(setAction, event)
                        }
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="VIEW">View</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="APPROVE">Approve</option>
                        <option value="REJECT">Reject</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Module"
                        value={module}
                        onChange={(event) =>
                            updateFilter(setModule, event)
                        }
                    />

                    <select
                        value={status}
                        onChange={(event) =>
                            updateFilter(setStatus, event)
                        }
                    >
                        <option value="">All Status</option>
                        <option value="SUCCESS">Success</option>
                        <option value="FAILED">Failed</option>
                    </select>

                    <input
                        type="date"
                        value={startDate}
                        onChange={(event) =>
                            updateFilter(setStartDate, event)
                        }
                    />

                    <input
                        type="date"
                        value={endDate}
                        onChange={(event) =>
                            updateFilter(setEndDate, event)
                        }
                    />

                    <button
                        className="activity-reset-button"
                        onClick={resetFilters}
                    >
                        Reset
                    </button>

                </div>

                {error && (
                    <div className="activity-error">
                        {error}
                    </div>
                )}

                <div className="activity-table-scroll">

                    <table className="activity-table">

                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Module</th>
                                <th>Action</th>
                                <th>Record ID</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Date & Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="activity-empty">
                                        Loading activities...
                                    </td>
                                </tr>
                            ) : activities.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="activity-empty">
                                        No activities found.
                                    </td>
                                </tr>
                            ) : (
                                activities.map((item) => (
                                    <tr key={item.id}>

                                        <td>
                                            <div className="activity-user">
                                                <strong>
                                                    {item.user_name || "Unknown"}
                                                </strong>
                                                <small>
                                                    {item.user_email || "—"}
                                                </small>
                                            </div>
                                        </td>

                                        <td>{item.module}</td>

                                        <td>
                                            <span className="activity-action">
                                                {item.action}
                                            </span>
                                        </td>

                                        <td>{item.record_id || "—"}</td>

                                        <td className="activity-description-cell">
                                            {item.description || "—"}
                                        </td>

                                        <td>
                                            <span
                                                className={`activity-status ${getStatusClass(item.status)}`}
                                            >
                                                {item.status}
                                            </span>
                                        </td>

                                        <td>{formatDate(item.created_at)}</td>

                                        <td>
                                            <button
                                                className="activity-view-button"
                                                onClick={() => openDetails(item.id)}
                                            >
                                                View
                                            </button>
                                        </td>

                                    </tr>
                                ))
                            )}

                        </tbody>

                    </table>

                </div>

                <div className="activity-pagination">

                    <span>
                        Showing {activities.length} of {pagination.total} activities
                    </span>

                    <div>
                        <button
                            disabled={pagination.page <= 1 || loading}
                            onClick={() =>
                                setPagination((previous) => ({
                                    ...previous,
                                    page: previous.page - 1,
                                }))
                            }
                        >
                            Previous
                        </button>

                        <strong>
                            {pagination.page} / {Math.max(1, pagination.totalPages)}
                        </strong>

                        <button
                            disabled={
                                pagination.page >= pagination.totalPages ||
                                loading
                            }
                            onClick={() =>
                                setPagination((previous) => ({
                                    ...previous,
                                    page: previous.page + 1,
                                }))
                            }
                        >
                            Next
                        </button>
                    </div>

                </div>

            </div>

            <ActivityDetails
                activity={selectedActivity}
                onClose={() => setSelectedActivity(null)}
            />

        </div>
    );
}

export default UserActivityPage;
