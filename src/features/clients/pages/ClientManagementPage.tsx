import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
} from "react";

import apiClient from "../../../api/client";
import "./ClientManagementPage.css";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    createClient,
    deleteClient,
    getClient,
    getClients,
    updateClient,
    updateClientStatus,
    type Client,
    type ClientInput,
    type ClientLocationMode,
    type ClientStatus,
} from "../api/clients.api";

type Employee = {
    id: number;
    name?: string;
    full_name?: string;
    employee_name?: string;
};


type Mode = "create" | "edit" | "view";

const statuses: ClientStatus[] = ["Active", "Hold", "Close"];

const emptyForm: ClientInput = {
    client_name: "",
    client_code: "",
    client_phone: "",
    client_email: "",
    address_line1: "",
    address_line2: "",
    country: "India",
    state: "Maharashtra",
    city: "",
    pin_code: "",
    location_name: "",
    location_mode: "manual",
    location_address: "",
    location_latitude: null,
    location_longitude: null,
    location_map_url: "",
    vehicle_tracking_reference: "",

    client_addition_date: new Date().toISOString().slice(0, 10),
    client_gstin: "",
    contact_person: "",
    client_status: "Active",
    credit_days: 0,
    under_employee_id: null,
    delivery_challan_provided: false,

    pan_number: "",
    aadhaar_number: "",
    dealer_registration_number: "",

    gst_document: null,
    pan_document: null,
    aadhaar_document: null,
    dealer_registration_document: null,
    visiting_card_front: null,
    visiting_card_back: null,
};

function getDocumentUrl(path?: string | null) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const baseUrl = (
        import.meta.env.VITE_API_BASE_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");

    return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}


function extractGoogleMapsCoordinates(
    mapUrl: string
): { latitude: number; longitude: number } | null {
    const value = mapUrl.trim();

    if (!value) return null;

    // Format: https://www.google.com/maps/@18.5204,73.8567,15z
    let match = value.match(
        /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
    );

    // Format: !3d18.5204!4d73.8567
    if (!match) {
        match = value.match(
            /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/
        );
    }

    // Formats: ?q=18.5204,73.8567, ?query=... or ?ll=...
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


export default function ClientManagementPage() {
    const [capturingLocation, setCapturingLocation] = useState(false);
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [mode, setMode] = useState<Mode | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [existing, setExisting] = useState<Client | null>(null);
    const [form, setForm] = useState<ClientInput>({
        ...emptyForm,
    });

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [clientToDelete, setClientToDelete] =
        useState<Client | null>(null);

    const [clientToChangeStatus, setClientToChangeStatus] =
        useState<Client | null>(null);

    const [updatingStatusId, setUpdatingStatusId] =
        useState<number | null>(null);

    const loadClients = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getClients({
                page,
                limit,
                search,
                status: statusFilter,
            });

            setClients(result.data ?? []);
            setTotal(result.pagination?.total ?? 0);
            setTotalPages(result.pagination?.totalPages ?? 1);
        } catch (err) {
            const response = (
                err as {
                    response?: {
                        data?: { message?: string };
                    };
                }
            ).response;

            setError(
                response?.data?.message ||
                "Unable to load clients. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, statusFilter]);

    const handleMapLinkChange = async (value: string) => {
        setField("location_map_url", value);

        // Extract coordinates directly if present in the URL.
        const coordinates = extractGoogleMapsCoordinates(value);

        if (coordinates) {
            setField("location_latitude", coordinates.latitude);
            setField("location_longitude", coordinates.longitude);
            return;
        }

        // Resolve short Google Maps links.
        // Remove fetch(value) and use your backend API instead.
        try {
            const response = await apiClient.post("/google-maps/resolve", {
                mapUrl: value,
            });

            const coordinates = response.data.data;

            setField("location_latitude", coordinates.latitude);
            setField("location_longitude", coordinates.longitude);
        } catch {
            setField("location_latitude", null);
            setField("location_longitude", null);
        }
    };


    useEffect(() => {
        let cancelled = false;

        const loadEmployees = async () => {
            setEmployeesLoading(true);

            try {
                const response = await apiClient.get("api/employees", {
                    params: {
                        page: 1,
                        limit: 100,
                        search: employeeSearch,
                        status: "all",
                    },
                });

                const result = response.data;

                const employeeList: Employee[] = Array.isArray(result.data)
                    ? result.data
                    : Array.isArray(result.data?.employees)
                        ? result.data.employees
                        : Array.isArray(result.data?.data)
                            ? result.data.data
                            : [];

                if (!cancelled) {
                    setEmployees(employeeList);
                }
            } catch (err) {
                console.error("Failed to load employees:", err);

                if (!cancelled) {
                    setEmployees([]);
                }
            } finally {
                if (!cancelled) {
                    setEmployeesLoading(false);
                }
            }
        };

        void loadEmployees();

        return () => {
            cancelled = true;
        };
    }, [employeeSearch]);

    useEffect(() => {
        void loadClients();
    }, [loadClients]);

    function setField<K extends keyof ClientInput>(
        key: K,
        value: ClientInput[K]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function closeForm() {
        setMode(null);
        setSelectedId(null);
        setExisting(null);
        setForm({ ...emptyForm });
        setError("");
        setNotice("");
    }

    async function openForm(
        nextMode: Mode,
        client?: Client
    ) {
        setError("");
        setNotice("");
        setExisting(null);
        setSelectedId(client?.id ?? null);
        setForm({ ...emptyForm });

        if (nextMode === "create" || !client) {
            setMode(nextMode);
            return;
        }

        try {
            const full = await getClient(client.id);

            setExisting(full);


            setForm({
                ...emptyForm,
                ...full,

                // Convert nullable API fields to the form's expected types.
                client_name: full.client_name ?? "",
                client_code: full.client_code ?? "",
                client_phone: full.client_phone ?? "",
                client_email: full.client_email ?? "",
                address_line1: full.address_line1 ?? "",
                address_line2: full.address_line2 ?? "",
                country: full.country ?? "India",
                state: full.state ?? "",
                city: full.city ?? "",
                pin_code: full.pin_code ?? "",

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

                client_addition_date:
                    full.client_addition_date
                        ? String(full.client_addition_date).slice(0, 10)
                        : emptyForm.client_addition_date,

                client_gstin: full.client_gstin ?? "",
                contact_person: full.contact_person ?? "",
                client_status: full.client_status ?? "Active",
                credit_days: full.credit_days ?? 0,
                under_employee_id: full.under_employee_id ?? null,
                delivery_challan_provided:
                    full.delivery_challan_provided ?? false,

                pan_number: full.pan_number ?? "",
                aadhaar_number: full.aadhaar_number ?? "",
                dealer_registration_number:
                    full.dealer_registration_number ?? "",

                // Files must be selected again only when replacing an existing file.
                gst_document: null,
                pan_document: null,
                aadhaar_document: null,
                dealer_registration_document: null,
                visiting_card_front: null,
                visiting_card_back: null,
            });


            setMode(nextMode);
        } catch {
            setError("Unable to load client details.");
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
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                setForm((current) => ({
                    ...current,
                    location_mode: "gps",
                    location_latitude: latitude,
                    location_longitude: longitude,
                    location_map_url:
                        `https://www.google.com/maps?q=${latitude},${longitude}`,
                }));

                setNotice("Current location captured successfully!");
                setCapturingLocation(false);
            },
            () => {
                setError(
                    "Unable to capture location. Allow location access and try again."
                );
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
        const url =
            form.location_latitude !== null &&
                form.location_longitude !== null
                ? `https://www.google.com/maps?q=${form.location_latitude},${form.location_longitude}`
                : "https://www.google.com/maps";

        window.open(url, "_blank", "noopener,noreferrer");
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!mode || mode === "view") return;

        setError("");
        setNotice("");

        const requiredFields: Array<
            [keyof ClientInput, string]
        > = [
                ["client_name", "Client name"],
                ["client_phone", "Client phone"],
                ["client_email", "Client email"],
                ["address_line1", "Address line 1"],
                ["country", "Country"],
                ["state", "State"],
                ["city", "City"],
                ["pin_code", "Pin code"],
                ["client_addition_date", "Client addition date"],
                ["client_gstin", "GSTIN"],
                ["contact_person", "Contact person"],
            ];

        const missing = requiredFields.find(
            ([key]) => !String(form[key] ?? "").trim()
        );

        if (missing) {
            setError(`${missing[1]} is required.`);
            return;
        }

        if (!/^\d{10}$/.test(form.client_phone)) {
            setError("Client phone number must contain 10 digits.");
            return;
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email)
        ) {
            setError("Enter a valid email address.");
            return;
        }

        if (!/^[A-Z0-9]{15}$/i.test(form.client_gstin)) {
            setError("Enter a valid 15-character GSTIN.");
            return;
        }

        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan_number)) {
            setError("Enter a valid PAN number.");
            return;
        }

        if (!/^\d{12}$/.test(form.aadhaar_number)) {
            setError("Aadhaar number must contain 12 digits.");
            return;
        }

        if (
            form.location_mode === "map_link" &&
            !form.location_map_url.trim()
        ) {
            setError("Enter a Google Maps link.");
            return;
        }

        const requiredFiles: Array<{
            key:
            | "gst_document"
            | "pan_document"
            | "aadhaar_document"
            | "dealer_registration_document"
            | "visiting_card_front"
            | "visiting_card_back";

            existingPath:
            | "gst_document_path"
            | "pan_document_path"
            | "aadhaar_document_path"
            | "dealer_registration_document_path"
            | "visiting_card_front"
            | "visiting_card_back";

            label: string;
        }> = [
                {
                    key: "gst_document",
                    existingPath: "gst_document_path",
                    label: "GST document",
                },
                {
                    key: "pan_document",
                    existingPath: "pan_document_path",
                    label: "PAN card",
                },
                {
                    key: "aadhaar_document",
                    existingPath: "aadhaar_document_path",
                    label: "Aadhaar card",
                },
                {
                    key: "dealer_registration_document",
                    existingPath: "dealer_registration_document_path",
                    label: "dealer registration document",
                },
                {
                    key: "visiting_card_front",
                    existingPath: "visiting_card_front",
                    label: "visiting card front",
                },
                {
                    key: "visiting_card_back",
                    existingPath: "visiting_card_back",
                    label: "visiting card back",
                },
            ];

        for (const file of requiredFiles) {
            if (
                mode === "create" &&
                !form[file.key]
            ) {
                setError(`Please upload the ${file.label}.`);
                return;
            }

            if (
                mode === "edit" &&
                !form[file.key] &&
                !existing?.[file.existingPath]
            ) {
                setError(`Please upload the ${file.label}.`);
                return;
            }
        }

        setSaving(true);

        try {
            if (mode === "create") {
                await createClient(form);
            } else if (selectedId !== null) {
                await updateClient(selectedId, form);
            }

            const message =
                mode === "create"
                    ? "Client added successfully."
                    : "Client updated successfully.";

            closeForm();
            await loadClients();
            setNotice(message);
        } catch (err) {
            const response = (
                err as {
                    response?: {
                        data?: { message?: string };
                    };
                }
            ).response;

            setError(
                response?.data?.message ||
                "Unable to save client."
            );
        } finally {
            setSaving(false);
        }
    }

    function requestStatusChange(client: Client) {
        setError("");
        setNotice("");
        setClientToChangeStatus(client);
    }

    async function confirmStatusChange() {
        if (!clientToChangeStatus) return;

        const client = clientToChangeStatus;

        const nextStatus: ClientStatus =
            client.client_status === "Active"
                ? "Hold"
                : client.client_status === "Hold"
                    ? "Close"
                    : "Active";

        setUpdatingStatusId(client.id);
        setError("");

        try {
            await updateClientStatus(client.id, nextStatus);

            setClientToChangeStatus(null);
            await loadClients();

            setNotice(
                `${client.client_name} status changed to ${nextStatus}.`
            );
        } catch {
            setError("Unable to update client status.");
        } finally {
            setUpdatingStatusId(null);
        }
    }

    async function removeClient(client: Client) {
        setDeletingId(client.id);
        setError("");

        try {
            await deleteClient(client.id);

            setClientToDelete(null);

            if (clients.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadClients();
            }

            setNotice("Client deleted successfully.");
        } catch {
            setError("Unable to delete client.");
        } finally {
            setDeletingId(null);
        }
    }

    const startIndex = (page - 1) * limit;

    const alert = error ? (
        <div className="client-alert client-alert--error" role="alert">
            {error}
        </div>
    ) : notice ? (
        <div className="client-alert client-alert--success" role="status">
            {notice}
        </div>
    ) : null;

    return (
        <ManagementLayout
            title="Manage Client"
            description="Manage client information, documents and locations."
            showForm={mode !== null}
            listTitle="Our Client List"
            addButtonText="Add Client"
            onAdd={() => void openForm("create")}
            onBack={closeForm}
            formTitle={
                mode === "create"
                    ? "Add Client"
                    : mode === "edit"
                        ? "Update Client"
                        : "Client Details"
            }
            error={alert}
            toolbar={
                mode === null ? (
                    <>
                        <div className="management-page__toolbar-group">
                            <label htmlFor="client-limit">Show</label>

                            <select
                                id="client-limit"
                                value={limit}
                                onChange={(event) => {
                                    setLimit(Number(event.target.value));
                                    setPage(1);
                                }}
                            >
                                {[10, 25, 50, 100].map((number) => (
                                    <option key={number} value={number}>
                                        {number}
                                    </option>
                                ))}
                            </select>

                            <span>entries</span>
                        </div>

                        <div className="management-page__toolbar-group">
                            <select
                                aria-label="Filter by client status"
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

                            <label htmlFor="client-search">Search:</label>

                            <input
                                id="client-search"
                                type="search"
                                value={search}
                                placeholder="Search clients..."
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
                            {Math.min(startIndex + clients.length, total)} of{" "}
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
                <div className="client-table-wrapper">
                    <table className="client-table">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                <th>Name</th>
                                <th>Code</th>
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
                                    <td colSpan={9} className="client-table-message">
                                        Loading clients...
                                    </td>
                                </tr>
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="client-table-message">
                                        No clients found.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client, index) => (
                                    <tr key={client.id}>
                                        <td>{startIndex + index + 1}</td>
                                        <td className="client-name-cell">
                                            {client.client_name || "—"}
                                        </td>
                                        <td className="table-no-wrap">
                                            {client.client_code || "—"}
                                        </td>
                                        <td className="table-no-wrap">
                                            {client.client_phone || "—"}
                                        </td>
                                        <td>{client.client_email || "—"}</td>
                                        <td>
                                            {[
                                                client.address_line1,
                                                client.city,
                                                client.pin_code,
                                            ]
                                                .filter(Boolean)
                                                .join(", ") || "—"}
                                        </td>
                                        <td>
                                            {client.location_map_url ? (
                                                <a
                                                    href={client.location_map_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View map
                                                </a>
                                            ) : (
                                                client.location_name || "—"
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={`client-status client-status--${client.client_status.toLowerCase()}`}
                                                disabled={updatingStatusId !== null}
                                                onClick={() =>
                                                    requestStatusChange(client)
                                                }
                                            >
                                                {updatingStatusId === client.id
                                                    ? "Updating..."
                                                    : client.client_status}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="client-actions">
                                                <ActionButton
                                                    action="edit"
                                                    type="button"
                                                    title="Edit client"
                                                    onClick={() =>
                                                        void openForm("edit", client)
                                                    }
                                                />

                                                {/* <button
                                                    type="button"
                                                    className="client-view-button"
                                                    onClick={() =>
                                                        void openForm("view", client)
                                                    }
                                                >
                                                    View
                                                </button> */}

                                                <ActionButton
                                                    action="delete"
                                                    type="button"
                                                    title="Delete client"
                                                    disabled={deletingId !== null}
                                                    onClick={() =>
                                                        setClientToDelete(client)
                                                    }
                                                >
                                                    Delete
                                                </ActionButton>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <form className="client-form" onSubmit={submit}>
                    <fieldset
                        className="client-fieldset"
                        disabled={mode === "view" || saving}
                    >
                        <legend>Client Information</legend>

                        <div className="client-form-grid">
                            <label className="client-form-field">
                                <span>Client Name *</span>
                                <input
                                    required
                                    value={form.client_name}
                                    onChange={(e) =>
                                        setField("client_name", e.target.value)
                                    }
                                />
                            </label>
                            <label className="client-form-field">
                                <span>Client Code</span>
                                <input
                                    type="text"
                                    value={form.client_code}
                                    placeholder="Enter client code"
                                    onChange={(e) =>
                                        setField("client_code", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Client Phone No *</span>
                                <input
                                    required
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={form.client_phone}
                                    onChange={(e) =>
                                        setField(
                                            "client_phone",
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 10)
                                        )
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Client Email ID *</span>
                                <input
                                    required
                                    type="email"
                                    value={form.client_email}
                                    onChange={(e) =>
                                        setField("client_email", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Client Address / Line-1 *</span>
                                <input
                                    required
                                    value={form.address_line1}
                                    onChange={(e) =>
                                        setField("address_line1", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Line-2</span>
                                <input
                                    value={form.address_line2}
                                    onChange={(e) =>
                                        setField("address_line2", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Country *</span>
                                <input
                                    required
                                    value={form.country}
                                    onChange={(e) =>
                                        setField("country", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>State *</span>
                                <input
                                    required
                                    value={form.state}
                                    onChange={(e) =>
                                        setField("state", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>City *</span>
                                <input
                                    required
                                    value={form.city}
                                    onChange={(e) =>
                                        setField("city", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Pin Code *</span>
                                <input
                                    required
                                    value={form.pin_code}
                                    onChange={(e) =>
                                        setField("pin_code", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Client Addition Date *</span>
                                <input
                                    required
                                    type="date"
                                    value={String(
                                        form.client_addition_date
                                    ).slice(0, 10)}
                                    onChange={(e) =>
                                        setField(
                                            "client_addition_date",
                                            e.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Client GSTIN *</span>
                                <input
                                    required
                                    maxLength={15}
                                    value={form.client_gstin}
                                    onChange={(e) =>
                                        setField(
                                            "client_gstin",
                                            e.target.value.toUpperCase()
                                        )
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Contact Person *</span>
                                <input
                                    required
                                    value={form.contact_person}
                                    onChange={(e) =>
                                        setField("contact_person", e.target.value)
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Client Status *</span>
                                <select
                                    required
                                    value={form.client_status}
                                    onChange={(e) =>
                                        setField(
                                            "client_status",
                                            e.target.value as ClientStatus
                                        )
                                    }
                                >
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="client-form-field">
                                <span>Credit Days *</span>
                                <input
                                    required
                                    type="number"
                                    min={0}
                                    max={3650}
                                    value={form.credit_days}
                                    onChange={(e) =>
                                        setField(
                                            "credit_days",
                                            Number(e.target.value)
                                        )
                                    }
                                />
                            </label>

                            <label className="client-form-field">
                                <span>Under Which Employee</span>

                                <div className="employee-select-container">
                                    <input
                                        type="text"
                                        placeholder={
                                            employeesLoading
                                                ? "Loading employees..."
                                                : "Search or select employee..."
                                        }
                                        value={
                                            employeeDropdownOpen
                                                ? employeeSearch
                                                : employees.find(
                                                    (employee) =>
                                                        employee.id === form.under_employee_id
                                                )
                                                    ? (
                                                        employees.find(
                                                            (employee) =>
                                                                employee.id === form.under_employee_id
                                                        )?.employee_name ||
                                                        employees.find(
                                                            (employee) =>
                                                                employee.id === form.under_employee_id
                                                        )?.full_name ||
                                                        employees.find(
                                                            (employee) =>
                                                                employee.id === form.under_employee_id
                                                        )?.name ||
                                                        ""
                                                    )
                                                    : employeeSearch
                                        }
                                        onFocus={() => {
                                            setEmployeeSearch("");
                                            setEmployeeDropdownOpen(true);
                                        }}
                                        onChange={(e) => {
                                            setEmployeeSearch(e.target.value);
                                            setEmployeeDropdownOpen(true);
                                        }}
                                        disabled={mode === "view" || saving || employeesLoading}
                                        autoComplete="off"
                                    />

                                    <button
                                        type="button"
                                        className="employee-select-arrow"
                                        onClick={() => {
                                            setEmployeeSearch("");
                                            setEmployeeDropdownOpen((prev) => !prev);
                                        }}
                                        disabled={mode === "view" || saving || employeesLoading}
                                    >
                                        ▼
                                    </button>

                                    {employeeDropdownOpen && (
                                        <div className="employee-select-options">
                                            <button
                                                type="button"
                                                className="employee-select-option"
                                                onClick={() => {
                                                    setField("under_employee_id", null);
                                                    setEmployeeSearch("");
                                                    setEmployeeDropdownOpen(false);
                                                }}
                                            >
                                                Select employee
                                            </button>

                                            {employees
                                                .filter((employee) => {
                                                    const name =
                                                        employee.employee_name ||
                                                        employee.full_name ||
                                                        employee.name ||
                                                        `Employee ${employee.id}`;

                                                    return name
                                                        .toLowerCase()
                                                        .includes(employeeSearch.toLowerCase());
                                                })
                                                .map((employee) => (
                                                    <button
                                                        type="button"
                                                        key={employee.id}
                                                        className="employee-select-option"
                                                        onClick={() => {
                                                            const name =
                                                                employee.employee_name ||
                                                                employee.full_name ||
                                                                employee.name ||
                                                                `Employee ${employee.id}`;

                                                            setField("under_employee_id", employee.id);
                                                            setEmployeeSearch(name);
                                                            setEmployeeDropdownOpen(false);
                                                        }}
                                                    >
                                                        {employee.employee_name ||
                                                            employee.full_name ||
                                                            employee.name ||
                                                            `Employee ${employee.id}`}
                                                    </button>
                                                ))}

                                            {!employeesLoading &&
                                                employees.filter((employee) => {
                                                    const name =
                                                        employee.employee_name ||
                                                        employee.full_name ||
                                                        employee.name ||
                                                        `Employee ${employee.id}`;

                                                    return name
                                                        .toLowerCase()
                                                        .includes(employeeSearch.toLowerCase());
                                                }).length === 0 && (
                                                    <div className="employee-select-empty">
                                                        No employees found
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </label>

                            <label className="client-form-field">
                                <span>Client Delivery Challan Provided *</span>
                                <select
                                    required
                                    value={String(
                                        form.delivery_challan_provided
                                    )}
                                    onChange={(e) =>
                                        setField(
                                            "delivery_challan_provided",
                                            e.target.value === "true"
                                        )
                                    }
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </label>
                        </div>
                    </fieldset>

                    <fieldset
                        className="client-fieldset"
                        disabled={mode === "view" || saving}
                    >
                        <legend>Client Location</legend>

                        <div className="client-location-options">
                            {(
                                [
                                    ["na", "N/A"],
                                    ["manual", "Self Add / Select"],
                                    ["map_link", "Map Link"],
                                    ["gps", "Live Location"],
                                    ["vehicle_tracking", "Vehicle Tracking"],
                                ] as [ClientLocationMode, string][]
                            ).map(([value, label]) => (
                                <label key={value}>
                                    <input
                                        type="radio"
                                        name="client-location-mode"
                                        checked={form.location_mode === value}
                                        onChange={() =>
                                            setField("location_mode", value)
                                        }
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>

                        {form.location_mode === "manual" && (
                            <div className="client-form-grid">
                                <label className="client-form-field">
                                    <span>Location Name</span>
                                    <input
                                        value={form.location_name}
                                        placeholder="e.g. Hadapsar, Pune"
                                        onChange={(e) =>
                                            setField(
                                                "location_name",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label className="client-form-field">
                                    <span>Location Address</span>
                                    <input
                                        value={form.location_address}
                                        onChange={(e) =>
                                            setField(
                                                "location_address",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>
                            </div>
                        )}


                        {form.location_mode === "map_link" && (
                            <div className="client-form-field">
                                <span>Google Maps URL *</span>

                                <input
                                    required
                                    type="url"
                                    placeholder="Paste Google Maps link"
                                    value={form.location_map_url}
                                    onChange={(e) =>
                                        handleMapLinkChange(e.target.value)
                                    }
                                />

                                {form.location_latitude !== null &&
                                    form.location_longitude !== null ? (
                                    <small>
                                        Coordinates detected successfully.
                                    </small>
                                ) : (
                                    <small>
                                        Paste a Google Maps URL containing coordinates.
                                    </small>
                                )}
                            </div>
                        )}


                        {form.location_mode === "gps" && (
                            <div className="client-location-tools">
                                <button
                                    type="button"
                                    className="client-secondary-button"
                                    onClick={captureGps}
                                    disabled={capturingLocation}
                                >
                                    {capturingLocation
                                        ? "Capturing Location..."
                                        : "Capture Current Location"}
                                </button>

                                {capturingLocation && (
                                    <p className="location-capture-message" role="status">
                                        Please wait, capturing your current location...
                                    </p>
                                )}

                                {notice === "Current location captured successfully!" && (
                                    <p className="location-capture-message" role="status">
                                        Current location captured successfully!
                                    </p>
                                )}

                                <span>
                                    {form.location_latitude !== null &&
                                        form.location_longitude !== null
                                        ? `${form.location_latitude}, ${form.location_longitude}`
                                        : "No GPS coordinates captured"}
                                </span>

                                <button
                                    type="button"
                                    className="client-secondary-button"
                                    onClick={openGoogleMaps}
                                >
                                    View on Map
                                </button>
                            </div>
                        )}

                        {form.location_mode === "vehicle_tracking" && (
                            <div className="client-form-field">
                                <span>Vehicle / Tracking Device Reference</span>
                                <input
                                    value={form.vehicle_tracking_reference}
                                    placeholder="Vehicle number or tracking device ID"
                                    onChange={(e) =>
                                        setField(
                                            "vehicle_tracking_reference",
                                            e.target.value
                                        )
                                    }
                                />

                                <small>
                                    Live vehicle tracking requires integration
                                    with your vehicle tracking provider.
                                </small>
                            </div>
                        )}

                        {!["na", "manual"].includes(form.location_mode) && (
                            <div className="client-form-grid">
                                <label className="client-form-field">
                                    <span>Latitude</span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={form.location_latitude ?? ""}
                                        onChange={(e) =>
                                            setField(
                                                "location_latitude",
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : null
                                            )
                                        }
                                    />
                                </label>

                                <label className="client-form-field">
                                    <span>Longitude</span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={form.location_longitude ?? ""}
                                        onChange={(e) =>
                                            setField(
                                                "location_longitude",
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : null
                                            )
                                        }
                                    />
                                </label>
                            </div>
                        )}
                    </fieldset>

                    <fieldset
                        className="client-fieldset"
                        disabled={mode === "view" || saving}
                    >
                        <legend>Documents & Visiting Card</legend>

                        <div className="client-form-grid">
                            <label className="client-form-field">
                                <span>Aadhaar Card Number *</span>
                                <input
                                    required
                                    maxLength={12}
                                    inputMode="numeric"
                                    value={form.aadhaar_number}
                                    onChange={(e) =>
                                        setField(
                                            "aadhaar_number",
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 12)
                                        )
                                    }
                                />
                            </label>
                            <label className="client-form-field">
                                <span>PAN Card Number *</span>
                                <input
                                    required
                                    maxLength={10}
                                    value={form.pan_number}
                                    onChange={(e) =>
                                        setField(
                                            "pan_number",
                                            e.target.value.toUpperCase()
                                        )
                                    }
                                />
                            </label>
                            <label className="client-form-field">
                                <span>Dealer Registration Number *</span>
                                <input
                                    required
                                    value={form.dealer_registration_number}
                                    onChange={(e) =>
                                        setField(
                                            "dealer_registration_number",
                                            e.target.value
                                        )
                                    }
                                />
                            </label>
                            <label className="client-form-field">
                                <span>Upload GST *</span>
                                {existing?.gst_document_path && (
                                    <a
                                        href={getDocumentUrl(existing.gst_document_path)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        View existing GST document
                                    </a>
                                )}
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    required={
                                        mode === "create" ||
                                        !existing?.gst_document_path
                                    }
                                    onChange={(e) =>
                                        setField(
                                            "gst_document",
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                />
                            </label>



                            <label className="client-form-field">
                                <span>Upload PAN Card *</span>
                                {existing?.pan_document_path && (
                                    <a
                                        href={getDocumentUrl(existing.pan_document_path)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        View existing PAN document
                                    </a>
                                )}
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    required={
                                        mode === "create" ||
                                        !existing?.pan_document_path
                                    }
                                    onChange={(e) =>
                                        setField(
                                            "pan_document",
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                />
                            </label>



                            <label className="client-form-field">
                                <span>Upload Aadhaar Card *</span>
                                {existing?.aadhaar_document_path && (
                                    <a
                                        href={getDocumentUrl(existing.aadhaar_document_path)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        View existing Aadhaar document
                                    </a>
                                )}
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    required={
                                        mode === "create" ||
                                        !existing?.aadhaar_document_path
                                    }
                                    onChange={(e) =>
                                        setField(
                                            "aadhaar_document",
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                />
                            </label>



                            <label className="client-form-field">
                                <span>Upload Dealer Registration *</span>
                                {existing?.dealer_registration_document_path && (
                                    <a
                                        href={getDocumentUrl(
                                            existing.dealer_registration_document_path
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        View existing dealer document
                                    </a>
                                )}
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    required={
                                        mode === "create" ||
                                        !existing?.dealer_registration_document_path
                                    }
                                    onChange={(e) =>
                                        setField(
                                            "dealer_registration_document",
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                />
                            </label>



                            <label className="client-form-field">
                                <span>Visiting Card front *</span>

                                {existing?.visiting_card_front && (
                                    <a
                                        href={getDocumentUrl(existing.visiting_card_front)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        View existing visiting card front
                                    </a>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    required={
                                        mode === "create" ||
                                        !existing?.visiting_card_front
                                    }
                                    onChange={(e) =>
                                        setField(
                                            "visiting_card_front",
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                />
                            </label>



                            <label className="client-form-field">
                                <span>Visiting Card back *</span>

                                {existing?.visiting_card_back && (
                                    <a
                                        href={getDocumentUrl(existing.visiting_card_back)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        View existing visiting card back
                                    </a>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    required={
                                        mode === "create" ||
                                        !existing?.visiting_card_back
                                    }
                                    onChange={(e) =>
                                        setField(
                                            "visiting_card_back",
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                />
                            </label>


                        </div>
                    </fieldset>

                    {mode === "view" && existing && (
                        <div className="client-readonly-details">
                            <p>
                                <strong>Client Code:</strong>{" "}
                                {existing.client_code || "—"}
                            </p>
                            <p>
                                <strong>Created:</strong>{" "}
                                {existing.created_at
                                    ? new Date(existing.created_at).toLocaleString()
                                    : "—"}
                            </p>
                        </div>
                    )}

                    <footer className="client-form-footer">
                        {mode !== "view" && (
                            <button
                                type="submit"
                                className="client-primary-button"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : mode === "create"
                                        ? "Save Client"
                                        : "Update Client"}
                            </button>
                        )}

                        <button
                            type="button"
                            className="client-secondary-button"
                            disabled={saving}
                            onClick={closeForm}
                        >
                            {mode === "view" ? "Back to List" : "Cancel"}
                        </button>

                        {mode === "view" && existing && (
                            <button
                                type="button"
                                className="client-primary-button"
                                onClick={() =>
                                    void openForm("edit", existing)
                                }
                            >
                                Edit Client
                            </button>
                        )}
                    </footer>
                </form>
            )}

            <ConfirmDialog
                open={clientToChangeStatus !== null}
                title="Change Client Status?"
                message={
                    clientToChangeStatus
                        ? `Change ${clientToChangeStatus.client_name}'s status? Active → Hold → Close → Active.`
                        : ""
                }
                itemName={clientToChangeStatus?.client_name || "this client"}
                confirmText="Confirm"
                loading={updatingStatusId !== null}
                onCancel={() => {
                    if (updatingStatusId === null) {
                        setClientToChangeStatus(null);
                    }
                }}
                onConfirm={() => void confirmStatusChange()}
            />

            <ConfirmDialog
                open={clientToDelete !== null}
                title="Delete Client?"
                message={
                    clientToDelete
                        ? `Are you sure you want to delete ${clientToDelete.client_name}?`
                        : ""
                }
                itemName={clientToDelete?.client_name || "this client"}
                confirmText="Delete"
                loading={deletingId !== null}
                onCancel={() => {
                    if (deletingId === null) {
                        setClientToDelete(null);
                    }
                }}
                onConfirm={() => {
                    if (clientToDelete) {
                        void removeClient(clientToDelete);
                    }
                }}
            />
        </ManagementLayout>
    );
}