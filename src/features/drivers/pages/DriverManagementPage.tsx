
import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./DriverManagementPage.css";
import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    createDriver,
    deleteDriver,
    getDriver,
    getDrivers,
    updateDriver,
    updateDriverStatus,
    type Driver,
    type DriverInput,
} from "../api/drivers.api";

const emptyForm: DriverInput = {
    driver_full_name: "",
    vehicle_number: "",
    contact_no: "",
    vehicle_type: "",
    status: "",
    aadhar_card_document: null,
    vehicle_registration_document: null,
};

type Mode = "create" | "edit" | "view";

const vehicleTypes = ["Truck", "Pickup", "Car", "Tempo", "Van", "Other"];

function getDocumentUrl(path?: string | null) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const baseUrl = (
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
    ).replace(/\/+$/, "");

    return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

export default function DriverManagementPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [mode, setMode] = useState<Mode | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [form, setForm] = useState<DriverInput>(emptyForm);
    const [existing, setExisting] = useState<Driver | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
    const [driverToChangeStatus, setDriverToChangeStatus] =
        useState<Driver | null>(null);
    const [updatingStatusId, setUpdatingStatusId] =
        useState<number | null>(null);
    const loadDrivers = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getDrivers({ page, limit, search });

            const rows = result.rows ?? [];
            const filteredRows =
                statusFilter === "All"
                    ? rows
                    : rows.filter((driver) => driver.status === statusFilter);

            setDrivers(filteredRows);
            setTotal(
                statusFilter === "All" ? result.total : filteredRows.length,
            );
        } catch {
            setError("Unable to load drivers. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, statusFilter]);

    useEffect(() => {
        void loadDrivers();
    }, [loadDrivers]);

    const openForm = async (nextMode: Mode, driver?: Driver) => {
        setError("");
        setNotice("");
        setExisting(null);
        setSelectedId(driver?.id ?? null);
        setForm({ ...emptyForm });

        if (nextMode === "create" || !driver) {
            setMode(nextMode);
            return;
        }

        try {
            const fullDriver = await getDriver(driver.id);

            setExisting(fullDriver);
            setForm({
                driver_full_name: fullDriver.driver_full_name ?? "",
                vehicle_number: fullDriver.vehicle_number ?? "",
                contact_no: fullDriver.contact_no ?? "",
                vehicle_type: fullDriver.vehicle_type ?? "",
                status: fullDriver.status ?? "",
                aadhar_card_document: null,
                vehicle_registration_document: null,
            });

            setMode(nextMode);
        } catch {
            setError("Unable to load driver details.");
        }
    };

    const closeForm = () => {
        setMode(null);
        setSelectedId(null);
        setExisting(null);
        setForm({ ...emptyForm });
        setError("");
        setNotice("");
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (mode === "view" || !mode) return;

        setError("");
        setNotice("");

        if (
            !form.driver_full_name.trim() ||
            !form.vehicle_number.trim() ||
            !form.contact_no.trim() ||
            !form.vehicle_type.trim() ||
            !form.status
        ) {
            setError("Please complete all required fields, including status.");
            return;
        }

        if (!/^\d{10}$/.test(form.contact_no.trim())) {
            setError("Contact number must contain 10 digits.");
            return;
        }

        if (
            mode === "create" &&
            (!form.aadhar_card_document ||
                !form.vehicle_registration_document)
        ) {
            setError("Please upload both required documents.");
            return;
        }

        if (
            mode === "edit" &&
            ((!form.aadhar_card_document &&
                !existing?.aadhar_card_document) ||
                (!form.vehicle_registration_document &&
                    !existing?.vehicle_registration_document))
        ) {
            setError("Both documents are required.");
            return;
        }

        setSaving(true);

        try {
            if (mode === "create") {
                await createDriver(form);
                setNotice("Driver added successfully.");
            } else if (mode === "edit" && selectedId !== null) {
                await updateDriver(selectedId, form);
                setNotice("Driver updated successfully.");
            }

            closeForm();
            await loadDrivers();
            setNotice(
                mode === "create"
                    ? "Driver added successfully."
                    : "Driver updated successfully.",
            );
        } catch (err) {
            const response = (
                err as { response?: { data?: { message?: string } } }
            ).response;

            setError(response?.data?.message || "Unable to save driver.");
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = (driver: Driver) => {
        if (updatingStatusId !== null) {
            return;
        }

        setError("");
        setNotice("");
        setDriverToChangeStatus(driver);
    };

    const handleConfirmStatusChange = async () => {
        if (!driverToChangeStatus || updatingStatusId !== null) {
            return;
        }

        const driver = driverToChangeStatus;

        const nextStatus =
            driver.status === "Active" ? "Inactive" : "Active";

        setUpdatingStatusId(driver.id);
        setError("");
        setNotice("");

        try {
            await updateDriverStatus(driver.id, nextStatus);

            setDriverToChangeStatus(null);
            setNotice(
                `${driver.driver_full_name || "Driver"} marked ${nextStatus.toLowerCase()} successfully.`,
            );

            await loadDrivers();
        } catch {
            setError("Unable to update driver status.");
        } finally {
            setUpdatingStatusId(null);
        }
    };
    const removeDriver = async (driver: Driver) => {
        setDeletingId(driver.id);
        setError("");
        setNotice("");

        try {
            await deleteDriver(driver.id);

            setDriverToDelete(null);
            setNotice("Driver deleted successfully.");

            if (drivers.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadDrivers();
            }
        } catch {
            setError("Unable to delete driver.");
        } finally {
            setDeletingId(null);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;

    return (
        <ManagementLayout
            title="Manage Driver"
            description="Manage driver details, vehicle information and documents."
            showForm={mode !== null}
            listTitle="Our Driver Registration List"
            addButtonText="Add Driver"
            onAdd={() => void openForm("create")}
            onBack={closeForm}
            formTitle={
                mode === "create"
                    ? "Add Driver"
                    : mode === "edit"
                        ? "Update Driver"
                        : "Driver Details"
            }
            error={
                error ? (
                    <div
                        className="driver-alert driver-alert-error"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : null
            }
            notice={
                notice ? (
                    <div
                        className="driver-alert driver-alert-success"
                        role="status"
                    >
                        {notice}
                    </div>
                ) : null
            }
            toolbar={
                <>
                    <div className="management-page__toolbar-group">
                        <label htmlFor="driver-limit">Show</label>

                        <select
                            id="driver-limit"
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
                            aria-label="Filter by driver status"
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>

                        <label htmlFor="driver-search">Search:</label>

                        <input
                            id="driver-search"
                            type="search"
                            value={search}
                            placeholder="Search drivers..."
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </>
            }
            pagination={
                <>
                    <span className="management-page__pagination-info">
                        Showing{" "}
                        {total === 0 ? 0 : startIndex + 1} to{" "}
                        {Math.min(startIndex + drivers.length, total)} of{" "}
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
            }
        >
            {mode === null ? (
                <div className="driver-table-wrapper">
                    <table className="driver-table">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                {/* <th>Driver ID</th> */}
                                <th>Driver Full Name</th>
                                <th>Vehicle Number</th>
                                <th>Contact No.</th>
                                <th>Vehicle Type</th>
                                <th>Aadhaar Card</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="driver-table-message">
                                        Loading drivers...
                                    </td>
                                </tr>
                            ) : drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="driver-table-message">
                                        No drivers found.
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((driver, index) => (
                                    <tr key={driver.id}>
                                        <td>{startIndex + index + 1}</td>

                                        {/* <td>
                                        DRV-{String(driver.id).padStart(4, "0")}
                                    </td> */}

                                        <td className="driver-name-cell">
                                            {driver.driver_full_name || "—"}
                                        </td>

                                        <td>{driver.vehicle_number || "—"}</td>
                                        <td>{driver.contact_no || "—"}</td>
                                        <td>{driver.vehicle_type || "—"}</td>

                                        <td>
                                            {driver.aadhar_card_document ? (
                                                <a
                                                    className="driver-document-link"
                                                    href={getDocumentUrl(
                                                        driver.aadhar_card_document,
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View document
                                                </a>
                                            ) : (
                                                <span className="driver-missing-document">
                                                    Not uploaded
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className={`driver-status ${driver.status === "Active" ? "is-active" : "is-inactive"
                                                    }`}
                                                disabled={updatingStatusId !== null}
                                                onClick={() => changeStatus(driver)}
                                                title="Click to change status"
                                            >
                                                {updatingStatusId === driver.id
                                                    ? "Updating..."
                                                    : driver.status}
                                            </button>
                                        </td>

                                        <td>
                                            <div className="driver-actions">
                                                <ActionButton
                                                    action="edit"
                                                    type="button"
                                                    title="Edit driver"
                                                    onClick={() => void openForm("edit", driver)}
                                                />
                                                <ActionButton
                                                    action="delete"
                                                    type="button"
                                                    title="Delete driver"
                                                    disabled={deletingId !== null}
                                                    onClick={() => setDriverToDelete(driver)}
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
                <>

                    <form onSubmit={submit}>
                        <fieldset
                            className="driver-fieldset"
                            disabled={mode === "view" || saving}
                        >
                            <legend>Driver Information</legend>

                            <div className="driver-form-grid">
                                <label className="driver-form-field">
                                    <span>
                                        Driver Full Name <b>*</b>
                                    </span>

                                    <input
                                        required
                                        value={form.driver_full_name}
                                        placeholder="Enter driver's full name"
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                driver_full_name:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </label>

                                <label className="driver-form-field">
                                    <span>
                                        Vehicle Number <b>*</b>
                                    </span>

                                    <input
                                        required
                                        placeholder="MH12 AB 1234"
                                        value={form.vehicle_number}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                vehicle_number:
                                                    event.target.value.toUpperCase(),
                                            })
                                        }
                                    />
                                </label>

                                <label className="driver-form-field">
                                    <span>
                                        Contact Number <b>*</b>
                                    </span>

                                    <input
                                        required
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        maxLength={10}
                                        placeholder="Enter 10-digit contact number"
                                        value={form.contact_no}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                contact_no:
                                                    event.target.value.replace(
                                                        /\D/g,
                                                        "",
                                                    ),
                                            })
                                        }
                                    />
                                </label>

                                <label className="driver-form-field">
                                    <span>
                                        Type of Vehicle <b>*</b>
                                    </span>

                                    <select
                                        required
                                        value={form.vehicle_type}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                vehicle_type:
                                                    event.target.value,
                                            })
                                        }
                                    >
                                        <option value="">
                                            Select vehicle type
                                        </option>

                                        {vehicleTypes.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="driver-form-field">
                                    <span>
                                        Status <b>*</b>
                                    </span>

                                    <select
                                        required
                                        value={form.status}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                status: event.target
                                                    .value as DriverInput["status"],
                                            }))
                                        }
                                    >
                                        <option value="">
                                            Select Status
                                        </option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">
                                            Inactive
                                        </option>
                                    </select>
                                </label>
                            </div>
                        </fieldset>

                        <fieldset
                            className="driver-fieldset driver-documents-fieldset"
                            disabled={mode === "view" || saving}
                        >
                            <legend>Required Documents</legend>

                            <div className="driver-form-grid">
                                <div className="driver-form-field driver-document-field">
                                    <label htmlFor="driver-aadhaar">
                                        Aadhaar Card <b>*</b>
                                    </label>

                                    {existing?.aadhar_card_document && (
                                        <div className="driver-existing-document">
                                            <span>
                                                Existing Aadhaar document is
                                                saved.
                                            </span>

                                            <a
                                                href={getDocumentUrl(
                                                    existing.aadhar_card_document,
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View current file
                                            </a>
                                        </div>
                                    )}

                                    <input
                                        id="driver-aadhaar"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        required={
                                            mode === "create" ||
                                            !existing?.aadhar_card_document
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                aadhar_card_document:
                                                    event.target.files?.[0] ??
                                                    null,
                                            })
                                        }
                                    />

                                    <small>
                                        Accepted formats: PDF, JPG, JPEG, PNG.
                                    </small>
                                </div>

                                <div className="driver-form-field driver-document-field">
                                    <label htmlFor="driver-registration">
                                        Vehicle Registration Document <b>*</b>
                                    </label>

                                    {existing?.vehicle_registration_document && (
                                        <div className="driver-existing-document">
                                            <span>
                                                Existing registration document
                                                is saved.
                                            </span>

                                            <a
                                                href={getDocumentUrl(
                                                    existing.vehicle_registration_document,
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View current file
                                            </a>
                                        </div>
                                    )}

                                    <input
                                        id="driver-registration"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        required={
                                            mode === "create" ||
                                            !existing?.vehicle_registration_document
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                vehicle_registration_document:
                                                    event.target.files?.[0] ??
                                                    null,
                                            })
                                        }
                                    />

                                    <small>
                                        Accepted formats: PDF, JPG, JPEG, PNG.
                                    </small>
                                </div>
                            </div>
                        </fieldset>

                        {mode === "view" && existing && (
                            <div className="driver-readonly-details">
                                <p>
                                    <strong>Driver ID:</strong>{" "}
                                    DRV-{String(existing.id).padStart(4, "0")}
                                </p>

                                <p>
                                    <strong>Status:</strong>{" "}
                                    <span
                                        className={`driver-status-label ${existing.status === "Active"
                                            ? "is-active"
                                            : "is-inactive"
                                            }`}
                                    >
                                        {existing.status}
                                    </span>
                                </p>

                                {existing.created_at && (
                                    <p>
                                        <strong>Created:</strong>{" "}
                                        {new Date(
                                            existing.created_at,
                                        ).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )}

                        <footer className="driver-form-footer">
                            {mode !== "view" && (
                                <button
                                    type="submit"
                                    className="driver-primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : mode === "create"
                                            ? "Save Driver"
                                            : "Update Driver"}
                                </button>
                            )}
                            <button
                                type="button"
                                className="driver-secondary-button"
                                onClick={closeForm}
                                disabled={saving}
                            >
                                {mode === "view" ? "Back to List" : "Cancel"}
                            </button>



                            {mode === "view" && (
                                <button
                                    type="button"
                                    className="driver-primary-button"
                                    onClick={() => {
                                        if (existing) {
                                            void openForm("edit", existing);
                                        }
                                    }}
                                >
                                    Edit Driver
                                </button>
                            )}
                        </footer>
                    </form>
                </>
            )}

<ConfirmDialog
    open={driverToDelete !== null}
    title="Delete Driver?"
    message={
        driverToDelete
            ? `Are you sure you want to delete ${
                  driverToDelete.driver_full_name || "this driver"
              }? This action cannot be undone.`
            : ""
    }
    itemName={driverToDelete?.driver_full_name || "this driver"}
    confirmText="Delete"
    loading={deletingId !== null}
    onCancel={() => {
        if (deletingId === null) {
            setDriverToDelete(null);
        }
    }}
    onConfirm={() => {
        if (driverToDelete && deletingId === null) {
            void removeDriver(driverToDelete);
        }
    }}
/>

        </ManagementLayout>
    );
}
