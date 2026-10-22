
import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./LocationManagementPage.css";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";
import LocationSearchSelect from "../components/LocationSearchSelect";

import {
    createLocation,
    deleteLocation,
    getLocation,
    getLocations,
    updateLocation,
    type Location,
} from "../api/locations.api";

type Mode = "create" | "edit" | "view";

type LocationForm = {
    locationName: string;
};

const emptyForm: LocationForm = {
    locationName: "",
};

export default function LocationManagementPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [mode, setMode] = useState<Mode | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [form, setForm] = useState<LocationForm>(emptyForm);
    const [existing, setExisting] = useState<Location | null>(null);
    const [locationToDelete, setLocationToDelete] =
        useState<Location | null>(null);

    const loadLocations = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getLocations({ page, limit, search });

            setLocations(result.data ?? []);
            setTotal(result.pagination?.total ?? result.data?.length ?? 0);
        } catch (err) {
            const response = (
                err as { response?: { data?: { message?: string } } }
            ).response;

            setError(
                response?.data?.message ||
                    "Unable to load locations. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    }, [page, limit, search]);

    useEffect(() => {
        void loadLocations();
    }, [loadLocations]);

    const openForm = async (nextMode: Mode, location?: Location) => {
        setError("");
        setNotice("");
        setExisting(null);
        setSelectedId(location?.id ?? null);
        setForm({ ...emptyForm });

        if (nextMode === "create") {
            setMode("create");
            return;
        }

        if (!location) return;

        try {
            const fullLocation = await getLocation(location.id);

            setExisting(fullLocation);
            setSelectedId(fullLocation.id);
            setForm({
                locationName: fullLocation.location_name ?? "",
            });
            setMode(nextMode);
        } catch (err) {
            const response = (
                err as { response?: { data?: { message?: string } } }
            ).response;

            setError(
                response?.data?.message ||
                    "Unable to load location details.",
            );
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

        if (!mode || mode === "view" || saving) return;

        const locationName = form.locationName.trim();

        if (!locationName) {
            setError("Please select a suggested location.");
            return;
        }

        setSaving(true);
        setError("");
        setNotice("");

        try {
            if (mode === "create") {
                await createLocation({ locationName });
            } else if (mode === "edit" && selectedId !== null) {
                await updateLocation(selectedId, { locationName });
            } else {
                return;
            }

            const successMessage =
                mode === "create"
                    ? "Location added successfully."
                    : "Location updated successfully.";

            closeForm();

            if (mode === "create" && page !== 1) {
                setPage(1);
            } else {
                await loadLocations();
            }

            setNotice(successMessage);
        } catch (err) {
            const response = (
                err as { response?: { data?: { message?: string } } }
            ).response;

            setError(
                response?.data?.message ||
                    "Unable to save location. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    };

    const removeLocation = async () => {
        if (!locationToDelete || deletingId !== null) return;

        const location = locationToDelete;

        setDeletingId(location.id);
        setError("");
        setNotice("");

        try {
            await deleteLocation(location.id);
            setLocationToDelete(null);
            setNotice("Location deleted successfully.");

            if (locations.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadLocations();
            }
        } catch (err) {
            const response = (
                err as { response?: { data?: { message?: string } } }
            ).response;

            setError(
                response?.data?.message ||
                    "Unable to delete location. Please try again.",
            );
        } finally {
            setDeletingId(null);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;

    return (
        <ManagementLayout
            title="Manage Location"
            description="Create and manage locations for your business."
            showForm={mode !== null}
            listTitle="Our Location List"
            addButtonText="Add Location"
            onAdd={() => void openForm("create")}
            onBack={closeForm}
            formTitle={
                mode === "create"
                    ? "Add Location"
                    : mode === "edit"
                      ? "Update Location"
                      : "Location Details"
            }
            error={
                error ? (
                    <div
                        className="location-alert location-alert-error"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : null
            }
            notice={
                notice ? (
                    <div
                        className="location-alert location-alert-success"
                        role="status"
                    >
                        {notice}
                    </div>
                ) : null
            }
            toolbar={
                <>
                    <div className="management-page__toolbar-group">
                        <label htmlFor="location-limit">Show</label>
                        <select
                            id="location-limit"
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
                        <label htmlFor="location-search">Search:</label>
                        <input
                            id="location-search"
                            type="search"
                            value={search}
                            placeholder="Search locations..."
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
                        Showing {total === 0 ? 0 : startIndex + 1} to{" "}
                        {Math.min(startIndex + locations.length, total)} of{" "}
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
                <div className="location-table-wrapper">
                    <table className="location-table">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                <th>Location Name</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="location-table-message">
                                        Loading locations...
                                    </td>
                                </tr>
                            ) : locations.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="location-table-message">
                                        No locations found.
                                    </td>
                                </tr>
                            ) : (
                                locations.map((location, index) => (
                                    <tr key={location.id}>
                                        <td>{startIndex + index + 1}</td>
                                        <td className="location-name-cell">
                                            {location.location_name || "—"}
                                        </td>
                                        <td>
                                            <div className="location-actions">
                                                <ActionButton
                                                    action="edit"
                                                    type="button"
                                                    title="Edit location"
                                                    onClick={() =>
                                                        void openForm("edit", location)
                                                    }
                                                />
                                                <ActionButton
                                                    action="delete"
                                                    type="button"
                                                    title="Delete location"
                                                    disabled={deletingId !== null}
                                                    onClick={() =>
                                                        setLocationToDelete(location)
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
                <form className="location-management-form" onSubmit={submit}>
                    <fieldset
                        className="location-fieldset"
                        disabled={mode === "view" || saving}
                    >

                        <p className="location-form-description">
                            Select a location from the suggestions to save it.
                        </p>

                        <div className="location-form-grid">
                            <div className="location-form-field">
                                <LocationSearchSelect
                                    value={form.locationName}
                                    onChange={(locationName) => {
                                        setForm((previous) => ({
                                            ...previous,
                                            locationName,
                                        }));
                                    }}
                                    disabled={mode === "view" || saving}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {mode === "view" && existing?.created_at && (
                        <div className="location-readonly-details">
                            <p>
                                <strong>Created:</strong>{" "}
                                {new Date(existing.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    )}

                    <footer className="location-form-footer">
                        {mode !== "view" && (
                            <button
                                type="submit"
                                className="location-primary-button"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : mode === "create"
                                      ? "Save Location"
                                      : "Update Location"}
                            </button>
                        )}

                        <button
                            type="button"
                            className="location-secondary-button"
                            onClick={closeForm}
                            disabled={saving}
                        >
                            {mode === "view" ? "Back to List" : "Cancel"}
                        </button>
                    </footer>
                </form>
            )}

            <ConfirmDialog
                open={locationToDelete !== null}
                title="Delete Location?"
                message={
                    locationToDelete
                        ? `Are you sure you want to delete "${locationToDelete.location_name}"? This action cannot be undone.`
                        : ""
                }
                itemName={locationToDelete?.location_name || "this location"}
                confirmText="Delete"
                loading={deletingId !== null}
                onCancel={() => {
                    if (deletingId === null) {
                        setLocationToDelete(null);
                    }
                }}
                onConfirm={() => void removeLocation()}
            />
        </ManagementLayout>
    );
}
