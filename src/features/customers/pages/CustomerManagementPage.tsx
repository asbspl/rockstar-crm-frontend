import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";

import apiClient from "../../../api/client";
import "./CustomerManagementPage.css";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    createCustomer,
    deleteCustomer,
    getCustomer,
    getCustomers,
    updateCustomer,
    updateCustomerStatus,
    type Customer,
    type CustomerInput,
} from "../api/customers.api";

type Mode = "create" | "edit" | "view";
type CustomerStatus = "Active" | "Hold" | "Close";

type LocationMode =
    | "na"
    | "manual"
    | "map_link"
    | "gps"
    | "vehicle_tracking";

type Employee = {
    id: number;
    name?: string;
    full_name?: string;
    employee_name?: string;
};

type RelatedClient = {
    id: number;
    client_name?: string;
    name?: string;
};

type RelatedLocation = {
    id: number;
    location_name?: string;
    name?: string;
};

type CustomerDocumentKey =
    | "visiting_card_front"
    | "visiting_card_back"
    | "shop_front"
    | "shop_back";

type CustomerDocumentPathKey = CustomerDocumentKey;

const statuses: CustomerStatus[] = [
    "Active",
    "Hold",
    "Close",
];

const locationModes: {
    value: LocationMode;
    label: string;
}[] = [
        { value: "na", label: "N/A" },
        { value: "manual", label: "Self Add / Select" },
        { value: "map_link", label: "Map Link" },
        { value: "gps", label: "Live Location" },
        { value: "vehicle_tracking", label: "Vehicle Tracking" },
    ];

const emptyForm: CustomerInput = {
    customer_name: "",
    client_id: null,
    location_id: null,
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    country: "India",
    state: "Maharashtra",
    city: "",
    pin_code: "",
    contact_person: "",
    status: "Active",
    under_employee_id: null,

    location_name: "",
    location_mode: "manual",
    location_address: "",
    location_latitude: null,
    location_longitude: null,
    location_map_url: "",
    vehicle_tracking_reference: "",

    visiting_card_front: null,
    visiting_card_back: null,
    shop_front: null,
    shop_back: null,
};

function getErrorMessage(
    error: unknown,
    fallback: string
): string {
    const err = error as {
        response?: {
            data?: {
                message?: string;
            };
        };
        message?: string;
    };

    return (
        err.response?.data?.message ||
        err.message ||
        fallback
    );
}

/**
 * Resolves existing customer document paths.
 *
 * Absolute URLs remain unchanged.
 * Relative paths are resolved against the backend host.
 * If VITE_API_BASE_URL includes /api, that suffix is removed
 * because uploaded files are commonly served from the backend root.
 */
function getDocumentUrl(path?: string | null): string {
    if (!path?.trim()) return "";

    const value = path.trim();

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    const configuredBase = (
        import.meta.env.VITE_API_BASE_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");

    const baseUrl = configuredBase.replace(/\/api$/i, "");

    return `${baseUrl}/${value.replace(/^\/+/, "")}`;
}

function extractGoogleMapsCoordinates(
    mapUrl: string
): {
    latitude: number;
    longitude: number;
} | null {
    const value = mapUrl.trim();

    if (!value) return null;

    let match = value.match(
        /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
    );

    if (!match) {
        match = value.match(
            /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/
        );
    }

    if (!match) {
        try {
            const parsed = new URL(value);

            const query =
                parsed.searchParams.get("q") ||
                parsed.searchParams.get("query") ||
                parsed.searchParams.get("ll");

            if (query) {
                match = query.match(
                    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
                );
            }
        } catch {
            return null;
        }
    }

    if (!match) return null;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return null;
    }

    return { latitude, longitude };
}

function getEmployeeName(employee: Employee): string {
    return (
        employee.employee_name ||
        employee.full_name ||
        employee.name ||
        `Employee ${employee.id}`
    );
}

function getClientName(client: RelatedClient): string {
    return (
        client.client_name ||
        client.name ||
        `Client ${client.id}`
    );
}

function getLocationName(location: RelatedLocation): string {
    return (
        location.location_name ||
        location.name ||
        `Location ${location.id}`
    );
}

/**
 * IDs may be returned by PostgreSQL/API responses as either
 * numbers or strings. Normalize them before comparing.
 */
function findClientById(
    clients: RelatedClient[],
    id: number | string | null | undefined
): RelatedClient | undefined {
    if (id == null || id === "") return undefined;

    return clients.find(
        (client) => Number(client.id) === Number(id)
    );
}

function findEmployeeById(
    employees: Employee[],
    id: number | string | null | undefined
): Employee | undefined {
    if (id == null || id === "") return undefined;

    return employees.find(
        (employee) => Number(employee.id) === Number(id)
    );
}

function findLocationById(
    locations: RelatedLocation[],
    id: number | string | null | undefined
): RelatedLocation | undefined {
    if (id == null || id === "") return undefined;

    return locations.find(
        (location) => Number(location.id) === Number(id)
    );
}

/**
 * Handles common API list response shapes:
 * data: []
 * data: { customers: [] }
 * data: { employees: [] }
 * data: { clients: [] }
 * data: { locations: [] }
 */
function extractList<T>(
    responseData: unknown,
    collectionKey: string
): T[] {
    const root = responseData as {
        data?: unknown;
    } | null;

    const payload = root?.data ?? responseData;

    if (Array.isArray(payload)) {
        return payload as T[];
    }

    if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;

        if (Array.isArray(record[collectionKey])) {
            return record[collectionKey] as T[];
        }

        if (Array.isArray(record.data)) {
            return record.data as T[];
        }
    }

    return [];
}

export default function CustomerManagementPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [relatedClients, setRelatedClients] = useState<RelatedClient[]>([]);
    const [relatedLocations, setRelatedLocations] = useState<RelatedLocation[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [capturingLocation, setCapturingLocation] = useState(false);
    const [resolvingMap, setResolvingMap] = useState(false);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [mode, setMode] = useState<Mode | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [existing, setExisting] = useState<Customer | null>(null);

    const [form, setForm] = useState<CustomerInput>({
        ...emptyForm,
    });

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [employeeSearch, setEmployeeSearch] = useState("");
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

    const [clientSearch, setClientSearch] = useState("");
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

    const [locationSearch, setLocationSearch] = useState("");
    const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [customerToChangeStatus, setCustomerToChangeStatus] =
        useState<Customer | null>(null);

    const mapRequestId = useRef(0);

    const setField = useCallback(
        <K extends keyof CustomerInput>(
            key: K,
            value: CustomerInput[K]
        ) => {
            setForm((current) => ({
                ...current,
                [key]: value,
            }));
        },
        []
    );

    const loadCustomers = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getCustomers({
                page,
                limit,
                search,
                status: statusFilter,
            });

            setCustomers(result.data ?? []);
            setTotal(result.pagination?.total ?? 0);
            setTotalPages(
                Math.max(1, result.pagination?.totalPages ?? 1)
            );
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to load customers. Please try again."
                )
            );
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, statusFilter]);

    useEffect(() => {
        void loadCustomers();
    }, [loadCustomers]);

    useEffect(() => {
        let cancelled = false;

        async function loadRelatedData() {
            setEmployeesLoading(true);

            try {
                const [
                    employeeResponse,
                    clientResponse,
                    locationResponse,
                ] = await Promise.allSettled([
                    apiClient.get("/api/employees", {
                        params: {
                            page: 1,
                            limit: 100,
                            status: "all",
                        },
                    }),
                    apiClient.get("/api/clients", {
                        params: {
                            page: 1,
                            limit: 100,
                        },
                    }),
                    apiClient.get("/api/locations", {
                        params: {
                            page: 1,
                            limit: 100,
                        },
                    }),
                ]);

                if (cancelled) return;

                if (employeeResponse.status === "fulfilled") {
                    setEmployees(
                        extractList<Employee>(
                            employeeResponse.value.data,
                            "employees"
                        )
                    );
                }

                if (clientResponse.status === "fulfilled") {
                    setRelatedClients(
                        extractList<RelatedClient>(
                            clientResponse.value.data,
                            "clients"
                        )
                    );
                }

                if (locationResponse.status === "fulfilled") {
                    setRelatedLocations(
                        extractList<RelatedLocation>(
                            locationResponse.value.data,
                            "locations"
                        )
                    );
                }
            } catch (err) {
                console.error(
                    "Failed to load customer dropdown data:",
                    err
                );
            } finally {
                if (!cancelled) {
                    setEmployeesLoading(false);
                }
            }
        }

        void loadRelatedData();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredEmployees = useMemo(() => {
        const query = employeeSearch.trim().toLowerCase();

        return employees.filter((employee) =>
            getEmployeeName(employee).toLowerCase().includes(query)
        );
    }, [employees, employeeSearch]);

    const filteredClients = useMemo(() => {
        const query = clientSearch.trim().toLowerCase();

        return relatedClients.filter((client) =>
            getClientName(client).toLowerCase().includes(query)
        );
    }, [relatedClients, clientSearch]);

    const filteredLocations = useMemo(() => {
        const query = locationSearch.trim().toLowerCase();

        return relatedLocations.filter((location) =>
            getLocationName(location).toLowerCase().includes(query)
        );
    }, [relatedLocations, locationSearch]);

    function closeForm() {
        mapRequestId.current += 1;

        setMode(null);
        setSelectedId(null);
        setExisting(null);
        setForm({ ...emptyForm });

        setEmployeeSearch("");
        setClientSearch("");
        setLocationSearch("");

        setEmployeeDropdownOpen(false);
        setClientDropdownOpen(false);
        setLocationDropdownOpen(false);

        setResolvingMap(false);
        setError("");
        setNotice("");
    }

    async function openForm(
        nextMode: Mode,
        customer?: Customer
    ) {
        mapRequestId.current += 1;

        setError("");
        setNotice("");
        setExisting(null);
        setSelectedId(customer?.id ?? null);
        setForm({ ...emptyForm });

        setEmployeeSearch("");
        setClientSearch("");
        setLocationSearch("");

        setEmployeeDropdownOpen(false);
        setClientDropdownOpen(false);
        setLocationDropdownOpen(false);

        if (nextMode === "create" || !customer) {
            setMode(nextMode);
            return;
        }

        try {
            const full = await getCustomer(customer.id);

            setExisting(full);

            const clientId =
                full.client_id == null
                    ? null
                    : Number(full.client_id);

            const employeeId =
                full.under_employee_id == null
                    ? null
                    : Number(full.under_employee_id);

            const locationId =
                full.location_id == null
                    ? null
                    : Number(full.location_id);

            setForm({
                ...emptyForm,
                ...full,

                customer_name: full.customer_name ?? "",
                client_id: clientId,
                location_id: locationId,

                phone: full.phone ?? "",
                email: full.email ?? "",
                address_line1: full.address_line1 ?? "",
                address_line2: full.address_line2 ?? "",
                country: full.country ?? "India",
                state: full.state ?? "",
                city: full.city ?? "",
                pin_code: full.pin_code ?? "",
                contact_person: full.contact_person ?? "",
                status: full.status ?? "Active",
                under_employee_id: employeeId,

                location_name: full.location_name ?? "",
                location_mode: full.location_mode ?? "manual",
                location_address: full.location_address ?? "",
                location_latitude:
                    full.location_latitude == null
                        ? null
                        : Number(full.location_latitude),
                location_longitude:
                    full.location_longitude == null
                        ? null
                        : Number(full.location_longitude),
                location_map_url: full.location_map_url ?? "",
                vehicle_tracking_reference:
                    full.vehicle_tracking_reference ?? "",

                // File inputs accept new File objects only.
                // Saved paths remain in `existing`.
                visiting_card_front: null,
                visiting_card_back: null,
                shop_front: null,
                shop_back: null,
            });

            const assignedEmployee = findEmployeeById(
                employees,
                employeeId
            );

            const assignedClient = findClientById(
                relatedClients,
                clientId
            );

            const assignedLocation = findLocationById(
                relatedLocations,
                locationId
            );

            setEmployeeSearch(
                assignedEmployee
                    ? getEmployeeName(assignedEmployee)
                    : ""
            );

            setClientSearch(
                assignedClient
                    ? getClientName(assignedClient)
                    : ""
            );

            setLocationSearch(
                assignedLocation
                    ? getLocationName(assignedLocation)
                    : full.location_name ?? ""
            );

            setMode(nextMode);
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to load customer details."
                )
            );
        }
    }

    async function handleMapLinkChange(value: string) {
        setField("location_map_url", value);
        setError("");

        const requestId = ++mapRequestId.current;
        const coordinates = extractGoogleMapsCoordinates(value);

        if (coordinates) {
            setField("location_latitude", coordinates.latitude);
            setField("location_longitude", coordinates.longitude);
            setResolvingMap(false);
            return;
        }

        if (!value.trim()) {
            setField("location_latitude", null);
            setField("location_longitude", null);
            setResolvingMap(false);
            return;
        }

        setResolvingMap(true);

        try {
            const response = await apiClient.post(
                "/google-maps/resolve",
                { mapUrl: value }
            );

            if (requestId !== mapRequestId.current) return;

            const result = response.data?.data;
            const latitude = Number(result?.latitude);
            const longitude = Number(result?.longitude);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180
            ) {
                throw new Error(
                    "The map link did not return valid coordinates."
                );
            }

            setField("location_latitude", latitude);
            setField("location_longitude", longitude);
        } catch {
            if (requestId === mapRequestId.current) {
                setField("location_latitude", null);
                setField("location_longitude", null);
            }
        } finally {
            if (requestId === mapRequestId.current) {
                setResolvingMap(false);
            }
        }
    }

    function captureGps() {
        setError("");
        setNotice("");

        if (!navigator.geolocation) {
            setError("GPS is not supported by this browser.");
            return;
        }

        setCapturingLocation(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                setForm((current) => ({
                    ...current,
                    location_mode: "gps",
                    location_latitude: latitude,
                    location_longitude: longitude,
                    location_map_url:
                        `https://www.google.com/maps?q=${latitude},${longitude}`,
                }));

                setNotice("Current location captured successfully.");
                setCapturingLocation(false);
            },
            (geoError) => {
                const message =
                    geoError.code === geoError.PERMISSION_DENIED
                        ? "Location permission was denied. Allow location access and try again."
                        : geoError.code === geoError.TIMEOUT
                            ? "Location request timed out. Please try again."
                            : "Unable to capture location. Check your device location settings.";

                setError(message);
                setCapturingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    }

    function openGoogleMaps() {
        const {
            location_latitude,
            location_longitude,
            location_map_url,
        } = form;

        const url =
            location_latitude != null &&
                location_longitude != null
                ? `https://www.google.com/maps?q=${location_latitude},${location_longitude}`
                : location_map_url?.trim() ||
                "https://www.google.com/maps";

        window.open(url, "_blank", "noopener,noreferrer");
    }

    function getNextStatus(status: string): CustomerStatus {
        if (status === "Active") return "Hold";
        if (status === "Hold") return "Close";
        return "Active";
    }

    function requestStatusChange(customer: Customer) {
        setError("");
        setNotice("");
        setCustomerToChangeStatus(customer);
    }

    async function confirmStatusChange() {
        if (!customerToChangeStatus) return;

        const customer = customerToChangeStatus;
        const nextStatus = getNextStatus(customer.status);

        setUpdatingStatusId(customer.id);
        setError("");

        try {
            await updateCustomerStatus(customer.id, nextStatus);

            setCustomerToChangeStatus(null);
            await loadCustomers();

            setNotice(
                `${customer.customer_name} status changed to ${nextStatus}.`
            );
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to update customer status."
                )
            );
        } finally {
            setUpdatingStatusId(null);
        }
    }

    async function removeCustomer(customer: Customer) {
        setDeletingId(customer.id);
        setError("");

        try {
            await deleteCustomer(customer.id);
            setCustomerToDelete(null);

            if (customers.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadCustomers();
            }

            setNotice("Customer deleted successfully.");
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to delete customer."
                )
            );
        } finally {
            setDeletingId(null);
        }
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!mode || mode === "view") return;

        setError("");
        setNotice("");

        const requiredFields: Array<
            [keyof CustomerInput, string]
        > = [
                ["customer_name", "Customer name"],
                ["client_id", "Client"],
                ["phone", "Phone number"],
                ["email", "Email address"],
                ["address_line1", "Address line 1"],
                ["country", "Country"],
                ["state", "State"],
                ["city", "City"],
                ["pin_code", "Pin code"],
                ["contact_person", "Contact person"],
            ];

        for (const [key, label] of requiredFields) {
            const value = form[key];

            if (
                value === null ||
                value === undefined ||
                String(value).trim() === ""
            ) {
                setError(`${label} is required.`);
                return;
            }
        }

        if (!/^\d{10}$/.test(String(form.phone))) {
            setError(
                "Phone number must contain exactly 10 digits."
            );
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email))) {
            setError("Enter a valid email address.");
            return;
        }

        if (!/^\d{4,10}$/.test(String(form.pin_code))) {
            setError("Enter a valid pin code.");
            return;
        }

        if (
            form.location_mode === "map_link" &&
            !String(form.location_map_url ?? "").trim()
        ) {
            setError("Enter a Google Maps link.");
            return;
        }

        if (
            form.location_mode === "map_link" &&
            (
                form.location_latitude == null ||
                form.location_longitude == null
            )
        ) {
            setError(
                "Resolve the Google Maps link before saving. Short links require the backend resolver."
            );
            return;
        }

        if (
            form.location_latitude != null &&
            (
                Number(form.location_latitude) < -90 ||
                Number(form.location_latitude) > 90
            )
        ) {
            setError("Latitude must be between -90 and 90.");
            return;
        }

        if (
            form.location_longitude != null &&
            (
                Number(form.location_longitude) < -180 ||
                Number(form.location_longitude) > 180
            )
        ) {
            setError("Longitude must be between -180 and 180.");
            return;
        }

        const requiredDocuments: {
            key: CustomerDocumentKey;
            pathKey: CustomerDocumentPathKey;
            label: string;
        }[] = [
                {
                    key: "visiting_card_front",
                    pathKey: "visiting_card_front",
                    label: "Visiting card front",
                },
                {
                    key: "visiting_card_back",
                    pathKey: "visiting_card_back",
                    label: "Visiting card back",
                },
                {
                    key: "shop_front",
                    pathKey: "shop_front",
                    label: "Shop front image",
                },
                {
                    key: "shop_back",
                    pathKey: "shop_back",
                    label: "Shop back image",
                },
            ];

        for (const document of requiredDocuments) {
            const newFile = form[document.key] as File | null;
            const oldPath = existing?.[document.pathKey] as
                | string
                | null
                | undefined;

            if (mode === "create" && !newFile) {
                setError(`Please upload ${document.label}.`);
                return;
            }

            if (mode === "edit" && !newFile && !oldPath) {
                setError(`Please upload ${document.label}.`);
                return;
            }
        }

        setSaving(true);

        try {
            if (mode === "create") {
                await createCustomer(form);
            } else if (selectedId !== null) {
                await updateCustomer(selectedId, form);
            }

            const message =
                mode === "create"
                    ? "Customer added successfully."
                    : "Customer updated successfully.";

            closeForm();
            await loadCustomers();
            setNotice(message);
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to save customer.")
            );
        } finally {
            setSaving(false);
        }
    }

    const startIndex = (page - 1) * limit;

    const alert = error ? (
        <div
            className="customer-alert customer-alert--error"
            role="alert"
        >
            {error}
        </div>
    ) : notice ? (
        <div
            className="customer-alert customer-alert--success"
            role="status"
        >
            {notice}
        </div>
    ) : null;

    return (
        <ManagementLayout
            title="Manage Customer"
            description="Manage customer information, linked clients, documents and locations."
            showForm={mode !== null}
            listTitle="Our Customer List"
            addButtonText="Add Customer"
            onAdd={() => void openForm("create")}
            onBack={closeForm}
            formTitle={
                mode === "create"
                    ? "Add Customer"
                    : mode === "edit"
                        ? "Update Customer"
                        : "Customer Details"
            }
            error={alert}
            toolbar={
                mode === null ? (
                    <>
                        <div className="management-page__toolbar-group">
                            <label htmlFor="customer-limit">
                                Show
                            </label>

                            <select
                                id="customer-limit"
                                value={limit}
                                onChange={(event) => {
                                    setLimit(Number(event.target.value));
                                    setPage(1);
                                }}
                            >
                                {[10, 25, 50, 100].map((number) => (
                                    <option
                                        key={number}
                                        value={number}
                                    >
                                        {number}
                                    </option>
                                ))}
                            </select>

                            <span>entries</span>
                        </div>

                        <div className="management-page__toolbar-group">
                            <select
                                aria-label="Filter by customer status"
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="All">All Statuses</option>

                                {statuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="customer-search">
                                Search:
                            </label>

                            <input
                                id="customer-search"
                                type="search"
                                value={search}
                                placeholder="Search customers..."
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </>
                ) : null
            }
            pagination={
                mode === null ? (
                    <>
                        <span className="management-page__pagination-info">
                            Showing {total === 0 ? 0 : startIndex + 1} to{" "}
                            {Math.min(startIndex + customers.length, total)} of{" "}
                            {total} entries
                        </span>

                        <div className="management-page__pagination-controls">
                            <button
                                type="button"
                                disabled={page <= 1 || loading}
                                onClick={() =>
                                    setPage((current) => current - 1)
                                }
                            >
                                Previous
                            </button>

                            <span>
                                Page {page} of {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={page >= totalPages || loading}
                                onClick={() =>
                                    setPage((current) => current + 1)
                                }
                            >
                                Next
                            </button>
                        </div>
                    </>
                ) : null
            }
        >
            {mode === null ? (
                <div className="customer-table-wrapper">
                    <table className="customer-table">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                <th>Customer Name</th>
                                <th>Client</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Address</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="customer-table-message"
                                    >
                                        Loading customers...
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="customer-table-message"
                                    >
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer, index) => {
                                    const client = findClientById(
                                        relatedClients,
                                        customer.client_id
                                    );

                                    return (
                                        <tr key={customer.id}>
                                            <td>
                                                {startIndex + index + 1}
                                            </td>

                                            <td className="customer-name-cell">
                                                {customer.customer_name || "—"}
                                            </td>

                                            <td>
                                                {client
                                                    ? getClientName(client)
                                                    : "—"}
                                            </td>

                                            <td className="table-no-wrap">{customer.phone || "—"}</td>
                                            <td>{customer.email || "—"}</td>

                                            <td>
                                                {[
                                                    customer.address_line1,
                                                    customer.city,
                                                    customer.pin_code,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ") || "—"}
                                            </td>

                                            <td>
                                                {customer.location_map_url ? (
                                                    <a
                                                        href={customer.location_map_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        View map
                                                    </a>
                                                ) : (
                                                    customer.location_latitude != null &&
                                                        customer.location_longitude != null ? (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${customer.location_latitude},${customer.location_longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            View map
                                                        </a>
                                                    ) : (
                                                        customer.location_name || "—"
                                                    )
                                                )}
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className={`customer-status customer-status--${String(
                                                        customer.status || "active"
                                                    ).toLowerCase()}`}
                                                    disabled={
                                                        updatingStatusId !== null
                                                    }
                                                    onClick={() =>
                                                        requestStatusChange(customer)
                                                    }
                                                    title="Click to change customer status"
                                                >
                                                    {updatingStatusId === customer.id
                                                        ? "Updating..."
                                                        : customer.status}
                                                </button>
                                            </td>

                                            <td>
                                                <div className="customer-actions">
                                                    <ActionButton
                                                        action="edit"
                                                        type="button"
                                                        title="Edit customer"
                                                        onClick={() =>
                                                            void openForm(
                                                                "edit",
                                                                customer
                                                            )
                                                        }
                                                    />

                                                    <ActionButton
                                                        action="delete"
                                                        type="button"
                                                        title="Delete customer"
                                                        disabled={deletingId !== null}
                                                        onClick={() =>
                                                            setCustomerToDelete(
                                                                customer
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <form
                    className="customer-form"
                    onSubmit={submit}
                >
                    <fieldset
                        className="customer-fieldset"
                        disabled={mode === "view" || saving}
                    >
                        <legend>Customer Information</legend>

                        <div className="customer-form-grid">
                            <label className="customer-form-field">
                                <span>Customer Name *</span>
                                <input
                                    required
                                    value={form.customer_name}
                                    onChange={(event) =>
                                        setField(
                                            "customer_name",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>Client *</span>

                                <div className="customer-related-select">
                                    <input
                                        required
                                        value={
                                            clientDropdownOpen
                                                ? clientSearch
                                                : (
                                                    findClientById(
                                                        relatedClients,
                                                        form.client_id
                                                    )
                                                        ? getClientName(
                                                            findClientById(
                                                                relatedClients,
                                                                form.client_id
                                                            )!
                                                        )
                                                        : clientSearch
                                                )
                                        }
                                        placeholder="Search or select client..."
                                        autoComplete="off"
                                        onFocus={() => {
                                            const selectedClient =
                                                findClientById(
                                                    relatedClients,
                                                    form.client_id
                                                );

                                            setClientSearch(
                                                selectedClient
                                                    ? getClientName(selectedClient)
                                                    : ""
                                            );

                                            setClientDropdownOpen(true);
                                        }}
                                        onChange={(event) => {
                                            setClientSearch(
                                                event.target.value
                                            );
                                            setClientDropdownOpen(true);
                                            setField("client_id", null);
                                        }}
                                        onBlur={() => {
                                            // Dropdown option clicks are handled
                                            // with onMouseDown below.
                                        }}
                                    />

                                    {clientDropdownOpen && (
                                        <div className="customer-related-options">
                                            <button
                                                type="button"
                                                onMouseDown={(event) =>
                                                    event.preventDefault()
                                                }
                                                onClick={() => {
                                                    setField("client_id", null);
                                                    setClientSearch("");
                                                    setClientDropdownOpen(false);
                                                }}
                                            >
                                                Select client
                                            </button>

                                            {filteredClients.map((client) => (
                                                <button
                                                    type="button"
                                                    key={client.id}
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={() => {
                                                        setField(
                                                            "client_id",
                                                            Number(client.id)
                                                        );
                                                        setClientSearch(
                                                            getClientName(client)
                                                        );
                                                        setClientDropdownOpen(false);
                                                    }}
                                                >
                                                    {getClientName(client)}
                                                </button>
                                            ))}

                                            {filteredClients.length === 0 && (
                                                <span>No clients found.</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </label>

                            <label className="customer-form-field">
                                <span>Phone Number *</span>
                                <input
                                    required
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={form.phone}
                                    onChange={(event) =>
                                        setField(
                                            "phone",
                                            event.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 10)
                                        )
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>Email Address *</span>
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={(event) =>
                                        setField("email", event.target.value)
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>Address Line 1 *</span>
                                <input
                                    required
                                    value={form.address_line1}
                                    onChange={(event) =>
                                        setField(
                                            "address_line1",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>Address Line 2</span>
                                <input
                                    value={form.address_line2}
                                    onChange={(event) =>
                                        setField(
                                            "address_line2",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>Country *</span>
                                <input
                                    required
                                    value={form.country}
                                    onChange={(event) =>
                                        setField("country", event.target.value)
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>State *</span>
                                <input
                                    required
                                    value={form.state}
                                    onChange={(event) =>
                                        setField("state", event.target.value)
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>City *</span>
                                <input
                                    required
                                    value={form.city}
                                    onChange={(event) =>
                                        setField("city", event.target.value)
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>Pin Code *</span>
                                <input
                                    required
                                    inputMode="numeric"
                                    value={form.pin_code}
                                    onChange={(event) =>
                                        setField(
                                            "pin_code",
                                            event.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 10)
                                        )
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>Contact Person *</span>
                                <input
                                    required
                                    value={form.contact_person}
                                    onChange={(event) =>
                                        setField(
                                            "contact_person",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="customer-form-field">
                                <span>Customer Status *</span>
                                <select
                                    required
                                    value={form.status}
                                    onChange={(event) =>
                                        setField(
                                            "status",
                                            event.target.value as CustomerInput["status"]
                                        )
                                    }
                                >
                                    {statuses.map((status) => (
                                        <option
                                            key={status}
                                            value={status}
                                        >
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="customer-form-field">
                                <span>Under Which Employee</span>

                                <div className="customer-related-select">
                                    <input
                                        value={
                                            employeeDropdownOpen
                                                ? employeeSearch
                                                : (
                                                    findEmployeeById(
                                                        employees,
                                                        form.under_employee_id
                                                    )
                                                        ? getEmployeeName(
                                                            findEmployeeById(
                                                                employees,
                                                                form.under_employee_id
                                                            )!
                                                        )
                                                        : employeeSearch
                                                )
                                        }
                                        placeholder={
                                            employeesLoading
                                                ? "Loading employees..."
                                                : "Search or select employee..."
                                        }
                                        autoComplete="off"
                                        disabled={employeesLoading}
                                        onFocus={() => {
                                            const selectedEmployee =
                                                findEmployeeById(
                                                    employees,
                                                    form.under_employee_id
                                                );

                                            setEmployeeSearch(
                                                selectedEmployee
                                                    ? getEmployeeName(
                                                        selectedEmployee
                                                    )
                                                    : ""
                                            );

                                            setEmployeeDropdownOpen(true);
                                        }}
                                        onChange={(event) => {
                                            setEmployeeSearch(
                                                event.target.value
                                            );
                                            setEmployeeDropdownOpen(true);
                                            setField(
                                                "under_employee_id",
                                                null
                                            );
                                        }}
                                    />

                                    {employeeDropdownOpen && (
                                        <div className="customer-related-options">
                                            <button
                                                type="button"
                                                onMouseDown={(event) =>
                                                    event.preventDefault()
                                                }
                                                onClick={() => {
                                                    setField(
                                                        "under_employee_id",
                                                        null
                                                    );
                                                    setEmployeeSearch("");
                                                    setEmployeeDropdownOpen(false);
                                                }}
                                            >
                                                Select employee
                                            </button>

                                            {filteredEmployees.map((employee) => (
                                                <button
                                                    type="button"
                                                    key={employee.id}
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={() => {
                                                        setField(
                                                            "under_employee_id",
                                                            Number(employee.id)
                                                        );
                                                        setEmployeeSearch(
                                                            getEmployeeName(employee)
                                                        );
                                                        setEmployeeDropdownOpen(false);
                                                    }}
                                                >
                                                    {getEmployeeName(employee)}
                                                </button>
                                            ))}

                                            {filteredEmployees.length === 0 && (
                                                <span>No employees found.</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>
                    </fieldset>

                    <fieldset
                        className="customer-fieldset"
                        disabled={mode === "view" || saving}
                    >
                        <legend>Customer Location</legend>

                        <div className="customer-location-options">
                            {locationModes.map(({ value, label }) => (
                                <label key={value}>
                                    <input
                                        type="radio"
                                        name="customer-location-mode"
                                        checked={form.location_mode === value}
                                        onChange={() => {
                                            setField("location_mode", value);
                                            setError("");
                                        }}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>

                        {form.location_mode === "manual" && (
                            <div className="customer-form-grid">
                                <label className="customer-form-field">
                                    <span>Location Name</span>

                                    <div className="customer-related-select">
                                        <input
                                            value={
                                                locationDropdownOpen
                                                    ? locationSearch
                                                    : (
                                                        findLocationById(
                                                            relatedLocations,
                                                            form.location_id
                                                        )
                                                            ? getLocationName(
                                                                findLocationById(
                                                                    relatedLocations,
                                                                    form.location_id
                                                                )!
                                                            )
                                                            : form.location_name ||
                                                            locationSearch
                                                    )
                                            }
                                            placeholder="Search or enter location..."
                                            autoComplete="off"
                                            onFocus={() => {
                                                const selectedLocation =
                                                    findLocationById(
                                                        relatedLocations,
                                                        form.location_id
                                                    );

                                                setLocationSearch(
                                                    selectedLocation
                                                        ? getLocationName(
                                                            selectedLocation
                                                        )
                                                        : form.location_name ?? ""
                                                );

                                                setLocationDropdownOpen(true);
                                            }}
                                            onChange={(event) => {
                                                setLocationSearch(
                                                    event.target.value
                                                );
                                                setField(
                                                    "location_name",
                                                    event.target.value
                                                );
                                                setField("location_id", null);
                                                setLocationDropdownOpen(true);
                                            }}
                                        />

                                        {locationDropdownOpen && (
                                            <div className="customer-related-options">
                                                <button
                                                    type="button"
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={() => {
                                                        setField(
                                                            "location_id",
                                                            null
                                                        );
                                                        setLocationDropdownOpen(false);
                                                    }}
                                                >
                                                    Use manual location
                                                </button>

                                                {filteredLocations.map((location) => (
                                                    <button
                                                        type="button"
                                                        key={location.id}
                                                        onMouseDown={(event) =>
                                                            event.preventDefault()
                                                        }
                                                        onClick={() => {
                                                            setField(
                                                                "location_id",
                                                                Number(location.id)
                                                            );
                                                            setField(
                                                                "location_name",
                                                                getLocationName(location)
                                                            );
                                                            setLocationSearch(
                                                                getLocationName(location)
                                                            );
                                                            setLocationDropdownOpen(false);
                                                        }}
                                                    >
                                                        {getLocationName(location)}
                                                    </button>
                                                ))}

                                                {filteredLocations.length === 0 && (
                                                    <span>No locations found.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </label>

                                <label className="customer-form-field">
                                    <span>Location Address</span>
                                    <input
                                        value={form.location_address}
                                        onChange={(event) =>
                                            setField(
                                                "location_address",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>
                            </div>
                        )}

                        {form.location_mode === "map_link" && (
                            <div className="customer-form-field">
                                <span>Google Maps URL *</span>
                                <input
                                    required
                                    type="url"
                                    placeholder="Paste Google Maps link"
                                    value={form.location_map_url}
                                    onChange={(event) =>
                                        void handleMapLinkChange(
                                            event.target.value
                                        )
                                    }
                                />

                                <small>
                                    {resolvingMap
                                        ? "Resolving map link..."
                                        : form.location_latitude != null &&
                                            form.location_longitude != null
                                            ? `Coordinates: ${form.location_latitude}, ${form.location_longitude}`
                                            : "Paste a Google Maps URL. Short links are resolved through the backend."}
                                </small>
                            </div>
                        )}

                        {form.location_mode === "gps" && (
                            <div className="customer-location-tools">
                                <button
                                    type="button"
                                    className="customer-secondary-button"
                                    onClick={captureGps}
                                    disabled={capturingLocation}
                                >
                                    {capturingLocation
                                        ? "Capturing Location..."
                                        : "Capture Current Location"}
                                </button>

                                <span>
                                    {form.location_latitude != null &&
                                        form.location_longitude != null
                                        ? `${form.location_latitude}, ${form.location_longitude}`
                                        : "No GPS coordinates captured"}
                                </span>

                                <button
                                    type="button"
                                    className="customer-secondary-button"
                                    onClick={openGoogleMaps}
                                >
                                    View on Map
                                </button>
                            </div>
                        )}

                        {form.location_mode === "vehicle_tracking" && (
                            <label className="customer-form-field">
                                <span>Vehicle / Tracking Device Reference</span>
                                <input
                                    value={form.vehicle_tracking_reference}
                                    placeholder="Vehicle number or tracking device ID"
                                    onChange={(event) =>
                                        setField(
                                            "vehicle_tracking_reference",
                                            event.target.value
                                        )
                                    }
                                />

                                <small>
                                    Live tracking requires integration with your tracking provider.
                                </small>
                            </label>
                        )}

                        {form.location_mode !== "na" &&
                            form.location_mode !== "manual" && (
                                <div className="customer-form-grid">
                                    <label className="customer-form-field">
                                        <span>Latitude</span>
                                        <input
                                            type="number"
                                            step="any"
                                            value={form.location_latitude ?? ""}
                                            onChange={(event) =>
                                                setField(
                                                    "location_latitude",
                                                    event.target.value
                                                        ? Number(event.target.value)
                                                        : null
                                                )
                                            }
                                        />
                                    </label>

                                    <label className="customer-form-field">
                                        <span>Longitude</span>
                                        <input
                                            type="number"
                                            step="any"
                                            value={form.location_longitude ?? ""}
                                            onChange={(event) =>
                                                setField(
                                                    "location_longitude",
                                                    event.target.value
                                                        ? Number(event.target.value)
                                                        : null
                                                )
                                            }
                                        />
                                    </label>
                                </div>
                            )}
                    </fieldset>

                    <fieldset
                        className="customer-fieldset"
                        disabled={mode === "view" || saving}
                    >
                        <legend>Documents & Images</legend>

                        <div className="customer-form-grid">
                            {(
                                [
                                    {
                                        key: "visiting_card_front",
                                        label: "Visiting Card Front",
                                    },
                                    {
                                        key: "visiting_card_back",
                                        label: "Visiting Card Back",
                                    },
                                    {
                                        key: "shop_front",
                                        label: "Shop Front Image",
                                    },
                                    {
                                        key: "shop_back",
                                        label: "Shop Back Image",
                                    },
                                ] as {
                                    key: CustomerDocumentKey;
                                    label: string;
                                }[]
                            ).map(({ key, label }) => {
                                const existingPath = existing?.[key] as
                                    | string
                                    | null
                                    | undefined;

                                const fileUrl =
                                    getDocumentUrl(existingPath);

                                return (
                                    <label
                                        className="customer-form-field"
                                        key={key}
                                    >
                                        <span>{label} *</span>

                                        {fileUrl && (
                                            <div className="customer-existing-file">
                                                <a
                                                    href={fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                    }}
                                                >
                                                    View existing{" "}
                                                    {label.toLowerCase()}
                                                </a>
                                            </div>
                                        )}

                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            required={
                                                mode === "create" ||
                                                !existingPath
                                            }
                                            onChange={(event) =>
                                                setField(
                                                    key,
                                                    event.target.files?.[0] ?? null
                                                )
                                            }
                                        />

                                        {existingPath && (
                                            <small>
                                                Existing file saved. Select a new file only if you want to replace it.
                                            </small>
                                        )}
                                    </label>
                                );
                            })}
                        </div>

                        <small>
                            When editing, existing files are retained unless
                            you select replacement files. Selecting a new file
                            does not remove the saved document until the
                            update succeeds.
                        </small>
                    </fieldset>

                    {mode === "view" && existing && (
                        <div className="customer-readonly-details">
                            <p>
                                <strong>Customer ID:</strong>{" "}
                                {existing.id}
                            </p>

                            <p>
                                <strong>Created:</strong>{" "}
                                {existing.created_at
                                    ? new Date(
                                        existing.created_at
                                    ).toLocaleString()
                                    : "—"}
                            </p>
                        </div>
                    )}

                    <footer className="customer-form-footer">
                        {mode !== "view" && (
                            <button
                                type="submit"
                                className="customer-primary-button"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : mode === "create"
                                        ? "Save Customer"
                                        : "Update Customer"}
                            </button>
                        )}

                        <button
                            type="button"
                            className="customer-secondary-button"
                            disabled={saving}
                            onClick={closeForm}
                        >
                            {mode === "view" ? "Back to List" : "Cancel"}
                        </button>

                        {mode === "view" && existing && (
                            <button
                                type="button"
                                className="customer-primary-button"
                                onClick={() =>
                                    void openForm("edit", existing)
                                }
                            >
                                Edit Customer
                            </button>
                        )}
                    </footer>
                </form>
            )}

            <ConfirmDialog
                open={customerToChangeStatus !== null}
                title="Change Customer Status?"
                message={
                    customerToChangeStatus
                        ? `Change ${customerToChangeStatus.customer_name}'s status? Active → Hold → Close → Active.`
                        : ""
                }
                itemName={
                    customerToChangeStatus?.customer_name ||
                    "this customer"
                }
                confirmText="Confirm"
                loading={updatingStatusId !== null}
                onCancel={() => {
                    if (updatingStatusId === null) {
                        setCustomerToChangeStatus(null);
                    }
                }}
                onConfirm={() => void confirmStatusChange()}
            />

            <ConfirmDialog
                open={customerToDelete !== null}
                title="Delete Customer?"
                message={
                    customerToDelete
                        ? `Are you sure you want to delete ${customerToDelete.customer_name}?`
                        : ""
                }
                itemName={
                    customerToDelete?.customer_name ||
                    "this customer"
                }
                confirmText="Delete"
                loading={deletingId !== null}
                onCancel={() => {
                    if (deletingId === null) {
                        setCustomerToDelete(null);
                    }
                }}
                onConfirm={() => {
                    if (customerToDelete) {
                        void removeCustomer(customerToDelete);
                    }
                }}
            />
        </ManagementLayout>
    );
}
