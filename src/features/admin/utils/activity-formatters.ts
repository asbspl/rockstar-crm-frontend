import type { Activity } from "../api/activity.api";

const hiddenFieldPattern =
    /(password|token|secret|credential|api[_-]?key|aadhaar|aadhar|pan|bank|ifsc|account[_-]?number|email|phone|mobile|ip[_-]?address|user[_-]?agent|document|file|photo|image|cookie|authorization|private[_-]?key|request|headers|stack|trace|debug|metadata)/i;

const fieldLabels: Record<string, string> = {
    amount: "Amount",
    client_id: "Client Name",
    company_id: "Company Name",
    contractor_id: "Contractor Name",
    customer_id: "Customer Name",
    discount: "Discount",
    driver_id: "Driver Name",
    employee_id: "Employee Name",
    expiry_date: "Expiry Date",
    grand_total: "Grand Total",
    location_id: "Location Name",
    product_id: "Product Name",
    quotation_date: "Quotation Date",
    quantity: "Quantity",
    qty: "Quantity",
    rate: "Rate",
    rate_incl_gst: "Rate Including GST",
    site_id: "Site Name",
    total_amount: "Total Amount",
    unit: "Unit",
    user_id: "User Name",
};

const statusLabels: Record<string, string> = {
    active: "Active",
    approved: "Approved",
    cancelled: "Cancelled",
    completed: "Completed",
    draft: "Draft",
    inactive: "Inactive",
    pending: "Pending",
    rejected: "Rejected",
    suspended: "Suspended",
};

interface ActivityModuleFormatConfig {
    labels?: Record<string, string>;
    currencyFields?: string[];
    dateFields?: string[];
}

const moduleFormatConfig: Record<string, ActivityModuleFormatConfig> = {
    quotations: {
        labels: {
            rate: "Rate Including GST",
            rate_incl_gst: "Rate Including GST",
        },
        currencyFields: ["amount", "grand_total", "rate_incl_gst", "total_amount"],
        dateFields: ["expiry_date", "quotation_date"],
    },
};

export interface ActivityChange {
    key: string;
    label: string;
    previousValue: unknown;
    newValue: unknown;
    itemChange?: "Added" | "Removed" | "Modified";
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSnapshot(value: unknown): unknown {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
    try {
        return JSON.parse(trimmed) as unknown;
    } catch {
        return "Details unavailable";
    }
}

function isHiddenField(key: string) {
    return hiddenFieldPattern.test(key) ||
        key.toLowerCase() === "id" ||
        key.toLowerCase() === "record_id" ||
        key.toLowerCase() === "entity_id" ||
        /^(created|updated|deleted)_at$/i.test(key);
}

function toWords(value: string) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function getModuleConfig(module: string) {
    return moduleFormatConfig[module.toLowerCase().replace(/[^a-z0-9]/g, "")];
}

export function formatActivityFieldLabel(path: string, module = "") {
    const key = path.split(".").at(-1) || path;
    const relatedName = key.match(/^(.+)_id$/i);
    if (relatedName) {
        return `${toWords(relatedName[1])} Name`;
    }

    return getModuleConfig(module)?.labels?.[key.toLowerCase()] ||
        fieldLabels[key.toLowerCase()] || path
        .split(".")
        .map((part) => toWords(part))
        .join(" · ");
}

export function formatActivityAction(action: string) {
    const labels: Record<string, string> = {
        ASSIGN_PERMISSION: "Permissions changed",
        ASSIGN_ROLE: "Role changed",
        CREATE: "Created",
        DELETE: "Deleted",
        IMPORT: "Imported",
        REJECT: "Rejected",
        STATUS_CHANGE: "Status changed",
        UPDATE: "Updated",
        APPROVE: "Approved",
        EXPORT: "Exported",
    };

    return labels[action.toUpperCase()] || toWords(action);
}

export function formatActivityModule(module: string) {
    return module
        .split(/[./_-]+/)
        .filter(Boolean)
        .map((part) => toWords(part))
        .join(" ");
}

const arrayIdentityKeys = [
    "id",
    "quotation_item_id",
    "order_item_id",
    "item_id",
    "product_id",
    "uuid",
    "code",
    "sku",
    "name",
    "title",
];

function getArrayIdentities(value: unknown): string[] {
    if (!isObject(value)) return [];
    return arrayIdentityKeys
        .filter((key) => value[key] !== null && value[key] !== undefined)
        .map((key) => `${key}:${String(value[key])}`);
}

interface ArrayPair {
    previous: unknown;
    next: unknown;
    previousIndex: number;
    nextIndex: number;
    itemChange: "Added" | "Removed" | "Modified" | undefined;
}

function pairArrayItems(previous: unknown[], next: unknown[]): ArrayPair[] {
    const pairs: ArrayPair[] = [];
    const matchedNext = new Set<number>();
    const matchedPrevious = new Set<number>();
    const nextByIdentity = new Map<string, number[]>();

    next.forEach((item, index) => {
        for (const identity of getArrayIdentities(item)) {
            const indices = nextByIdentity.get(identity) || [];
            indices.push(index);
            nextByIdentity.set(identity, indices);
        }
    });

    previous.forEach((item, previousIndex) => {
        const candidate = getArrayIdentities(item)
            .map((identity) => nextByIdentity.get(identity)?.find(
                (index) => !matchedNext.has(index),
            ))
            .find((index) => index !== undefined);
        if (candidate === undefined) return;
        matchedPrevious.add(previousIndex);
        matchedNext.add(candidate);
        pairs.push({
            previous: item,
            next: next[candidate],
            previousIndex,
            nextIndex: candidate,
            itemChange: "Modified",
        });
    });

    const fallbackCount = Math.min(previous.length, next.length);
    for (let index = 0; index < fallbackCount; index += 1) {
        if (matchedPrevious.has(index) || matchedNext.has(index)) continue;
        if (getArrayIdentities(previous[index]).length || getArrayIdentities(next[index]).length) continue;
        matchedPrevious.add(index);
        matchedNext.add(index);
        pairs.push({
            previous: previous[index],
            next: next[index],
            previousIndex: index,
            nextIndex: index,
            itemChange: "Modified",
        });
    }

    previous.forEach((item, index) => {
        if (!matchedPrevious.has(index)) {
            pairs.push({
                previous: item,
                next: undefined,
                previousIndex: index,
                nextIndex: -1,
                itemChange: "Removed",
            });
        }
    });
    next.forEach((item, index) => {
        if (!matchedNext.has(index)) {
            pairs.push({
                previous: undefined,
                next: item,
                previousIndex: -1,
                nextIndex: index,
                itemChange: "Added",
            });
        }
    });

    return pairs;
}

function getArrayItemLabel(rawItem: unknown, displayItem: unknown, index: number) {
    const candidates = [
        "product_name",
        "item_name",
        "name",
        "title",
        "quotation_no",
        "order_no",
        "sku",
    ];
    for (const item of [displayItem, rawItem]) {
        if (!isObject(item)) continue;
        for (const key of candidates) {
            const value = item[key];
            if (typeof value === "string" && value.trim()) return value;
        }
        for (const key of ["product_id", "item_id"]) {
            const value = item[key];
            if (typeof value === "string" && value.trim() && value !== "Name unavailable") {
                return value;
            }
        }
    }
    return `Item ${index + 1}`;
}

function isNumericField(key: string) {
    return /(amount|price|rate|cost|subtotal|grand.?total|tax|gst|quantity|qty|discount|percent|count|weight|distance|duration)/i.test(key);
}

function normalizedDate(value: unknown, key: string, module: string) {
    if (!isDateField(key, module) || (typeof value !== "string" && !(value instanceof Date))) {
        return null;
    }
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

function valuesEqual(left: unknown, right: unknown, key: string, module: string): boolean {
    if (Object.is(left, right)) return true;

    const leftDate = normalizedDate(left, key, module);
    const rightDate = normalizedDate(right, key, module);
    if (leftDate !== null && rightDate !== null) return leftDate === rightDate;

    if (
        isNumericField(key) &&
        (typeof left === "number" || typeof right === "number" ||
            (typeof left === "string" && typeof right === "string"))
    ) {
        const leftNumber = typeof left === "string" && left.trim() !== "" ? Number(left) : left;
        const rightNumber = typeof right === "string" && right.trim() !== "" ? Number(right) : right;
        if (
            typeof leftNumber === "number" && Number.isFinite(leftNumber) &&
            typeof rightNumber === "number" && Number.isFinite(rightNumber)
        ) {
            return leftNumber === rightNumber;
        }
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        const pairs = pairArrayItems(left, right);
        return pairs.length === left.length &&
            pairs.length === right.length &&
            pairs.every((pair) =>
                pair.itemChange === "Modified" &&
                valuesEqual(pair.previous, pair.next, key, module)
            );
    }

    if (isObject(left) && isObject(right)) {
        const leftKeys = Object.keys(left).filter((field) => !isHiddenField(field));
        const rightKeys = Object.keys(right).filter((field) => !isHiddenField(field));
        return leftKeys.length === rightKeys.length &&
            leftKeys.every((field) =>
                Object.prototype.hasOwnProperty.call(right, field) &&
                valuesEqual(left[field], right[field], field, module)
            );
    }
    return false;
}

function collectChanges(
    rawPrevious: unknown,
    rawNext: unknown,
    displayPrevious: unknown,
    displayNext: unknown,
    prefix: string,
    module: string,
    changes: ActivityChange[],
    itemChange?: ActivityChange["itemChange"],
) {
    const currentKey = prefix.split(".").at(-1) || "";
    if (valuesEqual(rawPrevious, rawNext, currentKey, module)) return;

    if (Array.isArray(rawPrevious) || Array.isArray(rawNext)) {
        const oldItems = Array.isArray(rawPrevious) ? rawPrevious : [];
        const newItems = Array.isArray(rawNext) ? rawNext : [];
        const oldDisplayItems = Array.isArray(displayPrevious) ? displayPrevious : [];
        const newDisplayItems = Array.isArray(displayNext) ? displayNext : [];
        const pairs = pairArrayItems(oldItems, newItems);
        if (pairs.length === 0 && prefix) {
            changes.push({
                key: prefix,
                label: formatActivityFieldLabel(prefix, module),
                previousValue: displayPrevious,
                newValue: displayNext,
                itemChange,
            });
            return;
        }
        for (const pair of pairs) {
            const itemIndex = pair.nextIndex >= 0 ? pair.nextIndex : pair.previousIndex;
            const rawItem = pair.next ?? pair.previous;
            const displayItem = pair.nextIndex >= 0
                ? newDisplayItems[pair.nextIndex]
                : oldDisplayItems[pair.previousIndex];
            const itemLabel = getArrayItemLabel(rawItem, displayItem, itemIndex);
            collectChanges(
                pair.previous,
                pair.next,
                pair.previousIndex >= 0 ? oldDisplayItems[pair.previousIndex] : undefined,
                pair.nextIndex >= 0 ? newDisplayItems[pair.nextIndex] : undefined,
                prefix ? `${prefix}.${itemLabel}` : itemLabel,
                module,
                changes,
                pair.itemChange,
            );
        }
        return;
    }

    if (isObject(rawPrevious) || isObject(rawNext)) {
        const oldObject = isObject(rawPrevious) ? rawPrevious : {};
        const newObject = isObject(rawNext) ? rawNext : {};
        const oldDisplayObject = isObject(displayPrevious) ? displayPrevious : {};
        const newDisplayObject = isObject(displayNext) ? displayNext : {};
        const keys = new Set([...Object.keys(oldObject), ...Object.keys(newObject)]);
        for (const key of keys) {
            if (isHiddenField(key)) continue;
            collectChanges(
                oldObject[key],
                newObject[key],
                Object.prototype.hasOwnProperty.call(oldDisplayObject, key)
                    ? oldDisplayObject[key]
                    : oldObject[key],
                Object.prototype.hasOwnProperty.call(newDisplayObject, key)
                    ? newDisplayObject[key]
                    : newObject[key],
                prefix ? `${prefix}.${key}` : key,
                module,
                changes,
                itemChange,
            );
        }
        return;
    }

    if (prefix) {
        changes.push({
            key: prefix,
            label: formatActivityFieldLabel(prefix, module),
            previousValue: displayPrevious,
            newValue: displayNext,
            itemChange,
        });
    }
}

export function getActivityChanges(activity: Activity): ActivityChange[] {
    const previous = parseSnapshot(activity.old_values);
    const next = parseSnapshot(activity.new_values);
    const displayPrevious = parseSnapshot(activity.resolved_old_values ?? previous);
    const displayNext = parseSnapshot(activity.resolved_new_values ?? next);
    const changes: ActivityChange[] = [];

    collectChanges(
        previous,
        next,
        displayPrevious,
        displayNext,
        "",
        activity.module,
        changes,
    );
    return changes;
}

function isCurrencyField(key: string, module: string) {
    if (getModuleConfig(module)?.currencyFields?.includes(key.toLowerCase())) return true;
    return /(amount|price|rate|cost|subtotal|grand.?total|tax|gst)/i.test(key) ||
        (/discount/i.test(key) && !/(percent|percentage|rate)/i.test(key));
}

function isDateField(key: string, module: string) {
    if (getModuleConfig(module)?.dateFields?.includes(key.toLowerCase())) return true;
    return /(^date$|_date$|_at$|expiry|expires)/i.test(key);
}

export function formatActivityValue(value: unknown, fieldKey: string, module = ""): string {
    if (value === null || value === undefined || value === "") {
        return /_id$/i.test(fieldKey) ? "Not assigned" : "Not provided";
    }

    if (
        /_id$/i.test(fieldKey) &&
        (typeof value === "number" ||
            (typeof value === "string" &&
                (/^\d+$/.test(value) || /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value))))
    ) {
        return "Name unavailable";
    }

    if (typeof value === "boolean") return value ? "Yes" : "No";

    if (isDateField(fieldKey, module) && (typeof value === "string" || value instanceof Date)) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return new Intl.DateTimeFormat("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
            }).format(date);
        }
    }

    if (typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))) {
        const number = Number(value);
        if (isCurrencyField(fieldKey, module)) {
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2,
            }).format(number);
        }
        return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(number);
    }

    if (typeof value === "string") {
        const status = statusLabels[value.toLowerCase()];
        return status || value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    return String(value);
}

export function getActivityRecordName(activity: Activity): string | null {
    const values = parseSnapshot(
        activity.resolved_new_values ?? activity.new_values ??
        activity.resolved_old_values ?? activity.old_values,
    );
    if (!isObject(values)) return null;

    const preferredKeys = [
        "company_name",
        "client_name",
        "customer_name",
        "site_name",
        "location_name",
        "product_name",
        "employee_name",
        "driver_name",
        "contractor_name",
        "full_name",
        "name",
        "quotation_no",
        "order_no",
        "title",
        "reference",
    ];

    for (const key of preferredKeys) {
        const value = values[key];
        if (typeof value === "string" && value.trim()) return value;
    }
    return null;
}
