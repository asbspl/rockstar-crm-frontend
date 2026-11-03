
import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
} from "react";

import {
    getActivities,
    getActivityById,
    getActivityFilters,
    getActivitySummary,
    recordActivityExport,
    type Activity,
    type ActivityFilterOptions,
    type ActivityFilters,
    type ActivityPagination,
    type ActivitySummary,
} from "../api/activity.api";

import ActivityDetails from "../components/ActivityDetails";
import {
    formatActivityAction,
    formatActivityModule,
    formatActivityValue,
    getActivityRecordName,
} from "../utils/activity-formatters";

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
    const [userId, setUserId] = useState("");
    const [status, setStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [selectedActivity, setSelectedActivity] =
        useState<Activity | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [filterOptions, setFilterOptions] =
        useState<ActivityFilterOptions>({
            actions: [],
            modules: [],
            users: [],
        });

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
                user_id: userId,
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
        userId,
        action,
        module,
        status,
        startDate,
        endDate,
    ]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadSummary();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadSummary]);

    useEffect(() => {
        getActivityFilters()
            .then(setFilterOptions)
            .catch((caughtError: unknown) => {
                setError(
                    caughtError instanceof Error
                        ? caughtError.message
                        : "Unable to load activity filters.",
                );
            });
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadActivities();
        }, 0);

        return () => window.clearTimeout(timer);
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

    const openDetails = async (id: number | string) => {
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

    const exportCSV = async () => {
        const headers = [
            "Performed By",
            "Action",
            "Module",
            "Description",
            "Status",
            "Date",
        ];

        const escapeCSV = (value: unknown) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const rows = activities.map((item) => [
            item.user_name || "Unknown user",
            formatActivityAction(item.action),
            formatActivityModule(item.module),
            [item.description, getActivityRecordName(item)].filter(Boolean).join(" — "),
            formatActivityValue(item.status, "status", item.module),
            new Date(item.created_at).toLocaleString("en-IN"),
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

        try {
            await recordActivityExport();
            setError("");
        } catch (caughtError) {
            setError(
                `The export could not be recorded: ${
                    caughtError instanceof Error
                        ? caughtError.message
                        : "Unexpected error"
                }`,
            );
        }

        link.click();

        URL.revokeObjectURL(url);
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
                        aria-label="Filter by user"
                        value={userId}
                        onChange={(event) =>
                            updateFilter(setUserId, event)
                        }
                    >
                        <option value="">All Users</option>
                        {filterOptions.users.map((user) => (
                            <option key={user.user_id} value={user.user_id}>
                                {user.user_name || "Unnamed user"}
                            </option>
                        ))}
                    </select>

                    <select
                        value={action}
                        onChange={(event) =>
                            updateFilter(setAction, event)
                        }
                    >
                        <option value="">All Actions</option>
                        {filterOptions.actions.map((availableAction) => (
                            <option key={availableAction} value={availableAction}>
                                {formatActivityAction(availableAction)}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Filter by module"
                        value={module}
                        onChange={(event) =>
                            updateFilter(setModule, event)
                        }
                    >
                        <option value="">All Modules</option>
                        {filterOptions.modules.map((availableModule) => (
                            <option key={availableModule} value={availableModule}>
                                {formatActivityModule(availableModule)}
                            </option>
                        ))}
                    </select>

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
                        aria-label="From date"
                        value={startDate}
                        onChange={(event) =>
                            updateFilter(setStartDate, event)
                        }
                    />

                    <input
                        type="date"
                        aria-label="To date"
                        value={endDate}
                        onChange={(event) =>
                            updateFilter(setEndDate, event)
                        }
                    />

                    {/* <button
                        className="activity-reset-button"
                        onClick={resetFilters}
                    >
                        Reset
                    </button> */}

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
                                <th>S/N</th>
                                <th>User</th>
                                <th>Module</th>
                                <th>Activity</th>
                                <th>Description</th>
                                {/* <th>Record ID</th> */}
                                <th>Status</th>
                                <th>Date & Time</th>
                                <th>View Details</th>
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
                                activities.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>
                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                        </td>

                                        <td>
                                            <div className="activity-user">
                                                <strong>
                                                    {item.user_name || "Unknown user"}
                                                </strong>
                                            </div>
                                        </td>

                                        <td>{formatActivityModule(item.module)}</td>

                                        <td>
                                            <span className="activity-action">
                                                {formatActivityAction(item.action)}
                                            </span>
                                        </td>

                                        <td className="activity-description-cell">
                                            {[item.description, getActivityRecordName(item)]
                                                .filter(Boolean)
                                                .join(" — ") || "—"}
                                        </td>

                                        <td>
                                            <span
                                                className={`activity-status ${getStatusClass(item.status)}`}
                                            >
                                                {formatActivityValue(item.status, "status", item.module)}
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
                        <label>
                            Rows per page{" "}
                            <select
                                aria-label="Rows per page"
                                value={pagination.limit}
                                onChange={(event) => {
                                    const limit = Number(event.target.value);
                                    setPagination({
                                        page: 1,
                                        limit,
                                        total: pagination.total,
                                        totalPages: pagination.totalPages,
                                    });
                                }}
                            >
                                {[10, 25, 50, 100].map((pageSize) => (
                                    <option key={pageSize} value={pageSize}>
                                        {pageSize}
                                    </option>
                                ))}
                            </select>
                        </label>
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
