
import type { Activity } from "../api/activity.api";

interface ActivityDetailsProps {
    activity: Activity | null;
    onClose: () => void;
}

const formatValue = (value: unknown) => {
    if (value === null || value === undefined) {
        return "—";
    }

    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }

    return String(value);
};

function ActivityDetails({
    activity,
    onClose,
}: ActivityDetailsProps) {
    if (!activity) return null;

    return (
        <div className="activity-modal-overlay" onClick={onClose}>
            <div
                className="activity-modal"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="activity-modal-header">
                    <div>
                        <h2>Activity Details</h2>
                        <p>Complete audit information</p>
                    </div>

                    <button
                        type="button"
                        className="activity-close-button"
                        onClick={onClose}
                        aria-label="Close activity details"
                    >
                        ×
                    </button>
                </div>

                <div className="activity-detail-body">
                    <div className="activity-detail-grid">
                        <div>
                            <span>User</span>
                            <strong>
                                {activity.user_name || "Unknown User"}
                            </strong>
                        </div>

                        <div>
                            <span>Email</span>
                            <strong>
                                {activity.user_email || "—"}
                            </strong>
                        </div>

                        <div>
                            <span>Action</span>
                            <strong>{activity.action}</strong>
                        </div>

                        <div>
                            <span>Module</span>
                            <strong>{activity.module}</strong>
                        </div>

                        <div>
                            <span>Record ID</span>
                            <strong>{activity.record_id || "—"}</strong>
                        </div>

                        <div>
                            <span>Status</span>
                            <strong>{activity.status}</strong>
                        </div>

                        <div>
                            <span>IP Address</span>
                            <strong>{activity.ip_address || "—"}</strong>
                        </div>

                        <div>
                            <span>Timestamp</span>
                            <strong>
                                {new Date(activity.created_at).toLocaleString()}
                            </strong>
                        </div>
                    </div>

                    <div className="activity-description">
                        <span>Description</span>
                        <p>{activity.description || "No description"}</p>
                    </div>

                    <div className="activity-description">
                        <span>Request Information</span>
                        <p>
                            {activity.request_method || "—"}{" "}
                            {activity.request_url || "—"}
                        </p>
                    </div>

                    <div className="activity-description">
                        <span>Browser / Device</span>
                        <p>{activity.user_agent || "—"}</p>
                    </div>

                    {activity.error_message && (
                        <div className="activity-description">
                            <span>Error Information</span>
                            <pre>{activity.error_message}</pre>
                        </div>
                    )}

                    <div className="activity-comparison">
                        <div>
                            <h3>Previous Values</h3>

                            <pre>
                                {formatValue(activity.old_values)}
                            </pre>
                        </div>

                        <div>
                            <h3>New Values</h3>

                            <pre>
                                {formatValue(activity.new_values)}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="activity-modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ActivityDetails;
