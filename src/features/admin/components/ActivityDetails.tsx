
import type { ReactNode } from "react";
import type { Activity } from "../api/activity.api";

import {
    formatActivityAction,
    formatActivityFieldLabel,
    formatActivityModule,
    formatActivityValue,
    getActivityChanges,
    type ActivityChange,
} from "../utils/activity-formatters";

interface ActivityDetailsProps {
    activity: Activity | null;
    onClose: () => void;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

/**
 * Converts an activity value into a safe object.
 * Supports PostgreSQL JSONB objects and JSON strings.
 */
function toDisplayObject(value: unknown): Record<string, unknown> {
    if (isObject(value)) return value;

    if (typeof value === "string") {
        try {
            const parsed: unknown = JSON.parse(value);
            return isObject(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }

    return {};
}

/**
 * Hide confidential fields but allow normal business fields,
 * including email, phone, IP address and user agent.
 */
function isVisibleField(key: string): boolean {
    const normalizedKey = key.toLowerCase();

    return (
        normalizedKey !== "id" &&
        !["record_id", "entity_id"].includes(normalizedKey) &&
        !/(password|token|secret|credential|api[_-]?key|aadhaar|aadhar|pan|bank|ifsc|account[_-]?number|document|file|photo|image|cookie|authorization|private[_-]?key|stack|trace|debug)/i.test(
            key,
        ) &&
        !/^(created|updated|deleted)_at$/i.test(key)
    );
}

function itemIdentity(item: unknown, index: number): string {
    if (isObject(item)) {
        const identityKey = [
            "id",
            "quotation_item_id",
            "order_item_id",
            "product_id",
            "name",
            "title",
        ].find(
            (key) =>
                item[key] !== undefined &&
                item[key] !== null,
        );

        if (identityKey) {
            return `${identityKey}:${String(item[identityKey])}`;
        }
    }

    return `index:${index}`;
}

function valuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true;

    if (Array.isArray(left) && Array.isArray(right)) {
        return (
            left.length === right.length &&
            left.every((value, index) =>
                valuesEqual(value, right[index]),
            )
        );
    }

    if (isObject(left) && isObject(right)) {
        const leftKeys = Object.keys(left).filter(isVisibleField);
        const rightKeys = Object.keys(right).filter(isVisibleField);

        return (
            leftKeys.length === rightKeys.length &&
            leftKeys.every(
                (key) =>
                    Object.prototype.hasOwnProperty.call(right, key) &&
                    valuesEqual(left[key], right[key]),
            )
        );
    }

    return false;
}

function renderStructuredValue(
    value: unknown,
    fieldKey: string,
    module: string,
): ReactNode {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return (
                <span className="activity-value-empty">
                    None
                </span>
            );
        }

        return (
            <div className="activity-value-list">
                {value.map((item, index) => (
                    <div
                        className="activity-value-card"
                        key={itemIdentity(item, index)}
                    >
                        {renderStructuredValue(item, fieldKey, module)}
                    </div>
                ))}
            </div>
        );
    }

    if (isObject(value)) {
        const fields = Object.entries(value).filter(
            ([key]) => isVisibleField(key),
        );

        if (fields.length === 0) {
            return (
                <span className="activity-value-empty">
                    Details unavailable
                </span>
            );
        }

        return (
            <dl className="activity-value-details">
                {fields.map(([key, fieldValue]) => (
                    <div key={key}>
                        <dt>
                            {formatActivityFieldLabel(key, module)}
                        </dt>

                        <dd>
                            {renderStructuredValue(
                                fieldValue,
                                key,
                                module,
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
        );
    }

    return (
        <span>
            {formatActivityValue(value, fieldKey, module)}
        </span>
    );
}

function getArrayChangeStatus(
    item: unknown,
    index: number,
    otherItems: unknown[],
    side: "previous" | "new",
) {
    const identity = itemIdentity(item, index);

    const otherIndex = otherItems.findIndex(
        (other, itemIndex) =>
            itemIdentity(other, itemIndex) === identity,
    );

    if (otherIndex === -1) {
        return side === "new" ? "Added" : "Removed";
    }

    return valuesEqual(item, otherItems[otherIndex])
        ? "Unchanged"
        : "Modified";
}

function renderChangeValue(
    value: unknown,
    otherValue: unknown,
    change: ActivityChange,
    side: "previous" | "new",
    module: string,
): ReactNode {
    if (!Array.isArray(value)) {
        return renderStructuredValue(
            value,
            change.key,
            module,
        );
    }

    if (value.length === 0) {
        return (
            <span className="activity-value-empty">
                None
            </span>
        );
    }

    const otherItems = Array.isArray(otherValue)
        ? otherValue
        : [];

    return (
        <div className="activity-value-list">
            {value.map((item, index) => {
                const status = getArrayChangeStatus(
                    item,
                    index,
                    otherItems,
                    side,
                );

                return (
                    <div
                        className="activity-value-card"
                        key={itemIdentity(item, index)}
                    >
                        {status !== "Unchanged" && (
                            <span
                                className={`activity-item-status ${status.toLowerCase()}`}
                            >
                                {status}
                            </span>
                        )}

                        {renderStructuredValue(
                            item,
                            change.key,
                            module,
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ActivityDetails({
    activity,
    onClose,
}: ActivityDetailsProps) {
    if (!activity) return null;

    const isLoginActivity =
        activity.module?.trim().toLowerCase() === "authentication" &&
        activity.action?.trim().toUpperCase() === "LOGIN";

    const isUpdateActivity =
        activity.action?.trim().toUpperCase() === "UPDATE";

    const changes = getActivityChanges(activity);

    const loginDetails = {
        ...toDisplayObject(activity.old_values),
        ...toDisplayObject(activity.new_values),
    };

    const hasLoginDetails = Object.keys(loginDetails).some(
        isVisibleField,
    );

    const occurredAt = new Date(activity.created_at);

    const timestamp = Number.isNaN(occurredAt.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          }).format(occurredAt);

    const status = String(activity.status || "UNKNOWN");

    return (
        <div
            className="activity-modal-overlay"
            onClick={onClose}
        >
            <section
                className="activity-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="activity-details-title"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Header */}
                <header className="activity-modal-header">
                    <div>
                        <span className="activity-modal-eyebrow">
                            {formatActivityModule(activity.module)}
                        </span>

                        <h2 id="activity-details-title">
                            {formatActivityAction(activity.action)}{" "}
                            {formatActivityModule(
                                activity.entity_type || activity.module,
                            )}
                        </h2>

                        <p>
                            {isLoginActivity
                                ? "Review the information recorded during this login."
                                : isUpdateActivity
                                  ? "Review the changes made to this record."
                                  : "Review the details of this activity."}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="activity-close-button"
                        onClick={onClose}
                        aria-label="Close activity details"
                    >
                        ×
                    </button>
                </header>

                <div className="activity-detail-body">
                    {/* Activity information */}
                    <div className="activity-detail-grid">
                        <div>
                            <span>Performed by</span>
                            <strong>
                                {activity.user_name || "Unknown user"}
                            </strong>
                        </div>

                        <div>
                            <span>Activity</span>
                            <strong>
                                {formatActivityAction(activity.action)}
                            </strong>
                        </div>

                        <div>
                            <span>Module</span>
                            <strong>
                                {formatActivityModule(activity.module)}
                            </strong>
                        </div>

                        <div>
                            <span>Date and time</span>
                            <strong>{timestamp}</strong>
                        </div>

                        <div>
                            <span>Result</span>
                            <strong
                                className={`activity-result ${status.toLowerCase()}`}
                            >
                                {formatActivityValue(
                                    status,
                                    "status",
                                    activity.module,
                                )}
                            </strong>
                        </div>
                    </div>

                    {/* Description */}
                    {activity.description && (
                        <div className="activity-description">
                            <span>Summary</span>
                            <p>{activity.description}</p>
                        </div>
                    )}

                    {/* Login details */}
                    {isLoginActivity && (
                        <section
                            className="activity-changes-section"
                            aria-label="Login details"
                        >
                            <div className="activity-changes-heading">
                                <div>
                                    <h3>Login Details</h3>
                                    <p>
                                        Information recorded during this
                                        login activity.
                                    </p>
                                </div>
                            </div>

                            {hasLoginDetails ? (
                                <div className="activity-login-details">
                                    {renderStructuredValue(
                                        loginDetails,
                                        "login_details",
                                        activity.module,
                                    )}
                                </div>
                            ) : (
                                <div className="activity-no-changes">
                                    No additional login details were recorded.
                                </div>
                            )}
                        </section>
                    )}

                    {/* Update changes */}
                    {isUpdateActivity && (
                        <section
                            className="activity-changes-section"
                            aria-label="Changed fields"
                        >
                            <div className="activity-changes-heading">
                                <div>
                                    <h3>Changes</h3>
                                    <p>
                                        Only values that changed are shown.
                                    </p>
                                </div>
                            </div>

                            {changes.length === 0 ? (
                                <div className="activity-no-changes">
                                    No changes detected.
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="activity-comparison-labels"
                                        aria-hidden="true"
                                    >
                                        <span>Field</span>
                                        <span>Previous Value</span>
                                        <span>New Value</span>
                                    </div>

                                    <div className="activity-change-list">
                                        {changes.map((change) => (
                                            <article
                                                className="activity-change-row"
                                                key={change.key}
                                            >
                                                <h4>
                                                    {change.label}

                                                    {change.itemChange && (
                                                        <span
                                                            className={`activity-item-status ${change.itemChange.toLowerCase()}`}
                                                        >
                                                            {change.itemChange}
                                                        </span>
                                                    )}
                                                </h4>

                                                <div className="activity-change-value previous">
                                                    <span className="activity-mobile-label">
                                                        Previous Value
                                                    </span>

                                                    {renderChangeValue(
                                                        change.previousValue,
                                                        change.newValue,
                                                        change,
                                                        "previous",
                                                        activity.module,
                                                    )}
                                                </div>

                                                <div className="activity-change-value next">
                                                    <span className="activity-mobile-label">
                                                        New Value
                                                    </span>

                                                    {renderChangeValue(
                                                        change.newValue,
                                                        change.previousValue,
                                                        change,
                                                        "new",
                                                        activity.module,
                                                    )}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    )}
                </div>

                {/* Footer */}
                <footer className="activity-modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default ActivityDetails;
