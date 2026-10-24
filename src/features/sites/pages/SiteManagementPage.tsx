import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import apiClient from "../../../api/client";
import "./SiteManagementPage.css";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    createSite,
    deleteSite,
    getSite,
    getSites,
    updateSite,
    type Site,
    type SiteInput,
    type SiteLocationMode,
} from "../api/sites.api";

type Mode = "create" | "edit";
type CustomerOption = { id: number; customer_name?: string; name?: string };
type LocationOption = {
    id: number;
    location_name?: string;
    name?: string;
    address?: string;
    location_address?: string;
    address_line1?: string;
};
type OptionResponse = {
    id?: number | string;
    customer_id?: number | string;
    location_id?: number | string;
    customer_name?: string;
    location_name?: string;
    name?: string;
    full_name?: string;
    address?: string;
    location_address?: string;
    address_line1?: string;
};

const locationModes: Array<[SiteLocationMode, string]> = [
    ["na", "N/A"],
    ["manual", "Self Add / Select"],
    ["map_link", "Map Link"],
    ["gps", "Live Location"],
    ["vehicle_tracking", "Vehicle Tracking"],
];

const emptyForm: SiteInput = {
    site_name: "",
    customer_id: 0,
    location_id: 0,
    contact_person: "",
    contact_number: "",
    line_1: "",
    line_2: "",
    country: "India",
    state: "Maharashtra",
    city: "",
    pin_code: "",

    site_location_mode: "manual",
    site_location_name: "",
    site_location_address: "",
    site_location_latitude: null,
    site_location_longitude: null,
    site_location_map_url: "",
    vehicle_tracking_reference: "",
};

function getErrorMessage(error: unknown, fallback: string): string {
    const value = error as {
        response?: { data?: { message?: string } };
        message?: string;
    };
    return value.response?.data?.message || value.message || fallback;
}

function extractRows(value: unknown): OptionResponse[] {
    if (Array.isArray(value)) return value as OptionResponse[];
    if (!value || typeof value !== "object") return [];

    const record = value as Record<string, unknown>;
    const data = record.data;
    if (Array.isArray(data)) return data as OptionResponse[];

    if (data && typeof data === "object") {
        const nested = data as Record<string, unknown>;
        for (const key of ["customers", "locations", "rows", "data", "items"]) {
            if (Array.isArray(nested[key])) return nested[key] as OptionResponse[];
        }
    }

    for (const key of ["customers", "locations", "rows", "items"]) {
        if (Array.isArray(record[key])) return record[key] as OptionResponse[];
    }
    return [];
}

function getSiteLocationDisplay(site: Site): string {
    return (
        site.site_location_name ||
        site.site_location_address ||
        (site.site_location_latitude != null && site.site_location_longitude != null
            ? `${site.site_location_latitude}, ${site.site_location_longitude}`
            : site.location_name || "—")
    );
}

function getLocationName(location: LocationOption): string {
    return location.location_name || location.name || `Location ${location.id}`;
}

function getLocationAddress(location: LocationOption): string {
    return location.location_address || location.address_line1 || location.address || "";
}

function extractGoogleMapsCoordinates(
    mapUrl: string,
): { latitude: number; longitude: number } | null {
    const value = mapUrl.trim();
    if (!value) return null;

    let match = value.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);

    if (!match) {
        match = value.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    }

    if (!match) {
        try {
            const parsed = new URL(value);
            const query =
                parsed.searchParams.get("q") ||
                parsed.searchParams.get("query") ||
                parsed.searchParams.get("ll");
            if (query) {
                match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
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

export default function SiteManagementPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [locationSearch, setLocationSearch] = useState("");
    const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
    const [resolvingMap, setResolvingMap] = useState(false);
    const mapRequestId = useRef(0);

    const [search, setSearch] = useState("");
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
    const [form, setForm] = useState<SiteInput>({ ...emptyForm });

    const [capturingLocation, setCapturingLocation] = useState(false);
    const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadSites = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await getSites({ page, limit, search });
            setSites(result.data ?? []);
            setTotal(result.pagination?.total ?? 0);
            setTotalPages(Math.max(1, result.pagination?.totalPages ?? 1));
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load sites. Please try again."));
        } finally {
            setLoading(false);
        }
    }, [page, limit, search]);

    useEffect(() => {
        void loadSites();
    }, [loadSites]);

    useEffect(() => {
        let cancelled = false;
        const loadOptions = async () => {
            setOptionsLoading(true);
            try {
                const [customerResponse, locationResponse] = await Promise.all([
                    apiClient.get("api/customers", {
                        params: { page: 1, limit: 500, search: "" },
                    }),
                    apiClient.get("api/locations", {
                        params: { page: 1, limit: 500, search: "" },
                    }),
                ]);

                const customerRows = extractRows(customerResponse.data)
                    .map((row) => ({
                        id: Number(row.id ?? row.customer_id),
                        customer_name: row.customer_name || row.name || row.full_name || "",
                    }))
                    .filter((row) => Number.isSafeInteger(row.id) && row.id > 0);

                const locationRows = extractRows(locationResponse.data)
                    .map((row) => ({
                        id: Number(row.id ?? row.location_id),
                        location_name: row.location_name || row.name || "",
                        location_address: row.location_address || "",
                        address_line1: row.address_line1 || "",
                        address: row.address || "",
                    }))
                    .filter((row) => Number.isSafeInteger(row.id) && row.id > 0);

                if (!cancelled) {
                    setCustomers(customerRows);
                    setLocations(locationRows);
                }
            } catch (err) {
                console.error("Unable to load customer/location dropdowns:", err);
                if (!cancelled) {
                    setCustomers([]);
                    setLocations([]);
                    setError((current) => current || "Unable to load Customer and Location options. Check the customers and locations APIs.");
                }
            } finally {
                if (!cancelled) setOptionsLoading(false);
            }
        };

        void loadOptions();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredLocations = useMemo(() => {
        const query = locationSearch.trim().toLowerCase();
        return locations.filter((location) =>
            getLocationName(location).toLowerCase().includes(query),
        );
    }, [locations, locationSearch]);

    function setField<K extends keyof SiteInput>(key: K, value: SiteInput[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function closeForm() {
        mapRequestId.current += 1;
        setMode(null);
        setSelectedId(null);
        setForm({ ...emptyForm });
        setLocationSearch("");
        setLocationDropdownOpen(false);
        setResolvingMap(false);
        setError("");
        setNotice("");
        setCapturingLocation(false);
    }

    async function openForm(nextMode: Mode, site?: Site) {
        mapRequestId.current += 1;
        setError("");
        setNotice("");
        setLocationDropdownOpen(false);
        setLocationSearch("");
        setResolvingMap(false);
        setForm({ ...emptyForm });
        setSelectedId(site?.id ?? null);

        if (nextMode === "create" || !site) {
            setMode("create");
            return;
        }

        try {
            const full = await getSite(site.id);
            const siteLocationName = full.site_location_name ?? "";

            setForm({
                ...emptyForm,
                ...full,
                site_name: full.site_name ?? "",
                customer_id: Number(full.customer_id ?? 0),
                location_id: Number(full.location_id ?? 0),
                contact_person: full.contact_person ?? "",
                contact_number: full.contact_number ?? "",
                line_1: full.line_1 ?? "",
                line_2: full.line_2 ?? "",
                country: full.country ?? "India",
                state: full.state ?? "Maharashtra",
                city: full.city ?? "",
                pin_code: full.pin_code ?? "",
                site_location_mode: full.site_location_mode ?? "manual",
                site_location_name: siteLocationName,
                site_location_address: full.site_location_address ?? "",
                site_location_latitude:
                    full.site_location_latitude == null
                        ? null
                        : Number(full.site_location_latitude),
                site_location_longitude:
                    full.site_location_longitude == null
                        ? null
                        : Number(full.site_location_longitude),
                site_location_map_url: full.site_location_map_url ?? "",
                vehicle_tracking_reference: full.vehicle_tracking_reference ?? "",
            });
            setLocationSearch(siteLocationName);
            setMode("edit");
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load site details."));
        }
    }

    async function handleMapLinkChange(value: string) {
        setField("site_location_map_url", value);
        setError("");

        const requestId = ++mapRequestId.current;
        const coordinates = extractGoogleMapsCoordinates(value);

        if (coordinates) {
            setField("site_location_latitude", coordinates.latitude);
            setField("site_location_longitude", coordinates.longitude);
            setResolvingMap(false);
            return;
        }

        if (!value.trim()) {
            setField("site_location_latitude", null);
            setField("site_location_longitude", null);
            setResolvingMap(false);
            return;
        }

        setResolvingMap(true);

        try {
            // Resolves shortened Google Maps URLs when this backend endpoint is configured.
            const response = await apiClient.post("/google-maps/resolve", {
                mapUrl: value,
            });

            if (requestId !== mapRequestId.current) return;

            const resolved = response.data?.data;
            const latitude = Number(resolved?.latitude);
            const longitude = Number(resolved?.longitude);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180
            ) {
                throw new Error("The map link did not return valid coordinates.");
            }

            setField("site_location_latitude", latitude);
            setField("site_location_longitude", longitude);
        } catch {
            if (requestId === mapRequestId.current) {
                setField("site_location_latitude", null);
                setField("site_location_longitude", null);
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
                    site_location_mode: "gps",
                    site_location_latitude: latitude,
                    site_location_longitude: longitude,
                    site_location_map_url: `https://www.google.com/maps?q=${latitude},${longitude}`,
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
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    }

    function openGoogleMaps() {
        const url =
            form.site_location_latitude != null && form.site_location_longitude != null
                ? `https://www.google.com/maps?q=${form.site_location_latitude},${form.site_location_longitude}`
                : form.site_location_map_url.trim() || "https://www.google.com/maps";

        window.open(url, "_blank", "noopener,noreferrer");
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!mode) return;

        setError("");
        setNotice("");

        if (!form.site_name.trim()) {
            setError("Site name is required.");
            return;
        }
        if (!Number.isSafeInteger(Number(form.customer_id)) || Number(form.customer_id) <= 0) {
            setError("Please select a customer.");
            return;
        }
        // if (!Number.isSafeInteger(Number(form.location_id)) || Number(form.location_id) <= 0) {
        //     setError("Please select a registered location.");
        //     return;
        // }
        if (form.contact_number.trim().length > 20) {
            setError("Contact number cannot exceed 20 characters.");
            return;
        }
        if (form.pin_code.trim() && !/^[A-Za-z0-9 -]{3,10}$/.test(form.pin_code.trim())) {
            setError("Enter a valid PIN code (3–10 letters, digits, spaces or hyphens).");
            return;
        }
        if (form.site_location_mode === "map_link" && !form.site_location_map_url.trim()) {
            setError("Enter a Google Maps link.");
            return;
        }
        if (
            form.site_location_mode === "map_link" &&
            (form.site_location_latitude == null || form.site_location_longitude == null)
        ) {
            setError("Resolve the Google Maps link before saving. Short links require the backend resolver.");
            return;
        }
        if (
            form.site_location_latitude != null &&
            (Number(form.site_location_latitude) < -90 || Number(form.site_location_latitude) > 90)
        ) {
            setError("Latitude must be between -90 and 90.");
            return;
        }
        if (
            form.site_location_longitude != null &&
            (Number(form.site_location_longitude) < -180 || Number(form.site_location_longitude) > 180)
        ) {
            setError("Longitude must be between -180 and 180.");
            return;
        }

        setSaving(true);
        try {
            const payload: SiteInput = {
                ...form,
                site_name: form.site_name.trim(),
                customer_id: Number(form.customer_id),
                location_id: Number(form.location_id),
                contact_person: form.contact_person.trim(),
                contact_number: form.contact_number.trim(),
                line_1: form.line_1.trim(),
                line_2: form.line_2.trim(),
                country: form.country.trim(),
                state: form.state.trim(),
                city: form.city.trim(),
                pin_code: form.pin_code.trim(),
                site_location_name: form.site_location_name.trim(),
                site_location_address: form.site_location_address.trim(),
                site_location_map_url: form.site_location_map_url.trim(),
                vehicle_tracking_reference: form.vehicle_tracking_reference.trim(),
            };

            if (mode === "create") {
                await createSite(payload);
            } else if (selectedId !== null) {
                await updateSite(selectedId, payload);
            } else {
                throw new Error("No site selected for update.");
            }

            const message = mode === "create" ? "Site added successfully." : "Site updated successfully.";
            closeForm();
            await loadSites();
            setNotice(message);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save site."));
        } finally {
            setSaving(false);
        }
    }

    async function removeSite(site: Site) {
        setDeletingId(site.id);
        setError("");
        try {
            await deleteSite(site.id);
            setSiteToDelete(null);
            if (sites.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadSites();
            }
            setNotice("Site deleted successfully.");
        } catch (err) {
            setError(getErrorMessage(err, "Unable to delete site."));
        } finally {
            setDeletingId(null);
        }
    }

    const startIndex = (page - 1) * limit;
    const alert = error ? (
        <div className="site-alert site-alert--error" role="alert">{error}</div>
    ) : notice ? (
        <div className="site-alert site-alert--success" role="status">{notice}</div>
    ) : null;

    return (
        <ManagementLayout
            title="Manage Site"
            description="Manage site details, customers, registered locations and site coordinates."
            showForm={mode !== null}
            listTitle="Our Site List"
            addButtonText="Add Site"
            onAdd={() => void openForm("create")}
            onBack={closeForm}
            formTitle={mode === "create" ? "Add Site" : "Update Site"}
            error={alert}
            toolbar={mode === null ? (
                <>
                    <div className="management-page__toolbar-group">
                        <label htmlFor="site-limit">Show</label>
                        <select
                            id="site-limit"
                            value={limit}
                            onChange={(event) => {
                                setLimit(Number(event.target.value));
                                setPage(1);
                            }}
                        >
                            {[10, 25, 50, 100].map((number) => (
                                <option key={number} value={number}>{number}</option>
                            ))}
                        </select>
                        <span>entries</span>
                    </div>
                    <div className="management-page__toolbar-group">
                        <label htmlFor="site-search">Search:</label>
                        <input
                            id="site-search"
                            type="search"
                            value={search}
                            placeholder="Search sites..."
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </>
            ) : null}
            pagination={mode === null ? (
                <>
                    <span className="management-page__pagination-info">
                        Showing {total === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + sites.length, total)} of {total} entries
                    </span>
                    <div className="management-page__pagination-controls">
                        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
                            Previous
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>
                            Next
                        </button>
                    </div>
                </>
            ) : null}
        >
            {mode === null ? (
                <div className="site-table-wrapper">
                    <table className="site-table">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                <th>Site</th>
                                <th>Customer</th>
                                <th>Location</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="site-table-message">Loading sites...</td></tr>
                            ) : sites.length === 0 ? (
                                <tr><td colSpan={5} className="site-table-message">No sites found.</td></tr>
                            ) : sites.map((site, index) => (
                                <tr key={site.id}>
                                    <td>{startIndex + index + 1}</td>
                                    <td className="site-name-cell">{site.site_name || "—"}</td>
                                    <td>{site.customer_name || customers.find((item) => item.id === Number(site.customer_id))?.customer_name || "—"}</td>
                                    <td>
                                        {site.site_location_map_url ? (
                                            <a href={site.site_location_map_url} target="_blank" rel="noreferrer">View map</a>
                                        ) : getSiteLocationDisplay(site)}
                                    </td>
                                    <td>
                                        <div className="site-actions">
                                            <ActionButton
                                                action="edit"
                                                type="button"
                                                title="Edit site"
                                                onClick={() => void openForm("edit", site)}
                                            />
                                            <ActionButton
                                                action="delete"
                                                type="button"
                                                title="Delete site"
                                                disabled={deletingId !== null}
                                                onClick={() => setSiteToDelete(site)}
                                            >
                                                Delete
                                            </ActionButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <form className="site-form" onSubmit={submit}>
                    <fieldset className="site-fieldset" disabled={saving}>
                        <legend>Site Information</legend>
                        <div className="site-form-grid">
                            <label className="site-form-field">
                                <span>Site Name *</span>
                                <input required value={form.site_name} onChange={(event) => setField("site_name", event.target.value)} />
                            </label>

                            <label className="site-form-field">
                                <span>Customer *</span>
                                <select required value={form.customer_id || ""} disabled={saving || optionsLoading} onChange={(event) => setField("customer_id", Number(event.target.value) || 0)}>
                                    <option value="">{optionsLoading ? "Loading customers..." : "Select customer"}</option>
                                    {customers.map((customer) => (
                                        <option key={customer.id} value={customer.id}>{customer.customer_name || customer.name || `Customer ${customer.id}`}</option>
                                    ))}
                                </select>
                            </label>

                            {/* <label className="site-form-field">
                                <span>Registered Location *</span>
                                <select required value={form.location_id || ""} disabled={saving || optionsLoading} onChange={(event) => setField("location_id", Number(event.target.value) || 0)}>
                                    <option value="">{optionsLoading ? "Loading locations..." : "Select location"}</option>
                                    {locations.map((location) => (
                                        <option key={location.id} value={location.id}>{location.location_name || location.name || `Location ${location.id}`}</option>
                                    ))}
                                </select>
                            </label> */}

                            <label className="site-form-field">
                                <span>Contact Person</span>
                                <input value={form.contact_person} onChange={(event) => setField("contact_person", event.target.value)} />
                            </label>
                            <label className="site-form-field">
                                <span>Contact Number</span>
                                <input type="tel" maxLength={20} value={form.contact_number} onChange={(event) => setField("contact_number", event.target.value)} />
                            </label>
                            <label className="site-form-field">
                                <span>Address / Line-1</span>
                                <input value={form.line_1} onChange={(event) => setField("line_1", event.target.value)} />
                            </label>
                            <label className="site-form-field">
                                <span>Line-2</span>
                                <input value={form.line_2} onChange={(event) => setField("line_2", event.target.value)} />
                            </label>
                            <label className="site-form-field">
                                <span>Country *</span>
                                <input required value={form.country} onChange={(event) => setField("country", event.target.value)} />
                            </label>
                            <label className="site-form-field">
                                <span>State *</span>
                                <input required value={form.state} onChange={(event) => setField("state", event.target.value)} />
                            </label>
                            <label className="site-form-field">
                                <span>City</span>
                                <input value={form.city} onChange={(event) => setField("city", event.target.value)} />
                            </label>
                            <label className="site-form-field">
                                <span>PIN Code</span>
                                <input maxLength={10} value={form.pin_code} onChange={(event) => setField("pin_code", event.target.value)} />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className="site-fieldset" disabled={saving}>
                        <legend>Site Location</legend>
                        <div className="site-location-options">
                            {locationModes.map(([value, label]) => (
                                <label key={value}>
                                    <input
                                        type="radio"
                                        name="site-location-mode"
                                        checked={form.site_location_mode === value}
                                        onChange={() => {
                                            setField("site_location_mode", value);
                                            setError("");
                                            setLocationDropdownOpen(false);
                                        }}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>

                        {form.site_location_mode === "manual" && (
                            <div className="site-form-grid">
                                <label className="site-form-field">
                                    <span>Site Location Name</span>
                                    <div className="site-related-select">
                                        <input
                                            value={locationDropdownOpen ? locationSearch : (form.site_location_name || locationSearch)}
                                            placeholder="Search or enter site location..."
                                            autoComplete="off"
                                            onFocus={() => {
                                                setLocationSearch(form.site_location_name || "");
                                                setLocationDropdownOpen(true);
                                            }}
                                            onChange={(event) => {
                                                setLocationSearch(event.target.value);
                                                setField("site_location_name", event.target.value);
                                                setLocationDropdownOpen(true);
                                            }}
                                            onBlur={() => {
                                                // Option clicks use onMouseDown to keep focus until selection.
                                            }}
                                        />
                                        {locationDropdownOpen && (
                                            <div className="site-related-options">
                                                <button
                                                    type="button"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => {
                                                        setField("site_location_name", locationSearch.trim());
                                                        setLocationDropdownOpen(false);
                                                    }}
                                                >
                                                    Use manual location
                                                </button>
                                                {filteredLocations.map((location) => (
                                                    <button
                                                        type="button"
                                                        key={location.id}
                                                        onMouseDown={(event) => event.preventDefault()}
                                                        onClick={() => {
                                                            const name = getLocationName(location);
                                                            setField("site_location_name", name);
                                                            const address = getLocationAddress(location);
                                                            if (address) setField("site_location_address", address);
                                                            setLocationSearch(name);
                                                            setLocationDropdownOpen(false);
                                                        }}
                                                    >
                                                        {getLocationName(location)}
                                                    </button>
                                                ))}
                                                {filteredLocations.length === 0 && (
                                                    <span>No locations found. You can use the typed location name.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <small>Select an existing location or type a new site location name.</small>
                                </label>
                                <label className="site-form-field">
                                    <span>Site Location Address</span>
                                    <input
                                        value={form.site_location_address}
                                        onChange={(event) => setField("site_location_address", event.target.value)}
                                    />
                                </label>
                            </div>
                        )}

                        {form.site_location_mode === "map_link" && (
                            <div className="site-form-field site-map-link-field">
                                <span>Google Maps URL *</span>
                                <input
                                    required
                                    type="url"
                                    placeholder="Paste Google Maps link"
                                    value={form.site_location_map_url}
                                    onChange={(event) => void handleMapLinkChange(event.target.value)}
                                />
                                <small>
                                    {resolvingMap
                                        ? "Resolving map link..."
                                        : form.site_location_latitude != null && form.site_location_longitude != null
                                          ? `Coordinates: ${form.site_location_latitude}, ${form.site_location_longitude}`
                                          : "Paste a Google Maps URL. Short links are resolved through the backend endpoint."}
                                </small>
                            </div>
                        )}

                        {form.site_location_mode === "gps" && (
                            <div className="site-location-tools">
                                <button type="button" className="site-secondary-button" onClick={captureGps} disabled={capturingLocation}>
                                    {capturingLocation ? "Capturing Location..." : "Capture Current Location"}
                                </button>
                                {capturingLocation && <p className="site-location-capture-message" role="status">Please wait, capturing your current location...</p>}
                                {notice === "Current location captured successfully." && <p className="site-location-capture-message" role="status">Current location captured successfully.</p>}
                                <span>
                                    {form.site_location_latitude !== null && form.site_location_longitude !== null
                                        ? `${form.site_location_latitude}, ${form.site_location_longitude}`
                                        : "No GPS coordinates captured"}
                                </span>
                                <button type="button" className="site-secondary-button" onClick={openGoogleMaps}>View on Map</button>
                            </div>
                        )}

                        {form.site_location_mode === "vehicle_tracking" && (
                            <div className="site-form-field site-tracking-field">
                                <span>Vehicle / Tracking Device Reference</span>
                                <input
                                    placeholder="Vehicle number or tracking device ID"
                                    value={form.vehicle_tracking_reference}
                                    onChange={(event) => setField("vehicle_tracking_reference", event.target.value)}
                                />
                                <small>Live vehicle tracking requires integration with your vehicle tracking provider.</small>
                            </div>
                        )}

                        {!(["na", "manual"] as SiteLocationMode[]).includes(form.site_location_mode) && (
                            <div className="site-form-grid site-coordinate-grid">
                                <label className="site-form-field">
                                    <span>Latitude</span>
                                    <input type="number" step="any" value={form.site_location_latitude ?? ""} onChange={(event) => setField("site_location_latitude", event.target.value ? Number(event.target.value) : null)} />
                                </label>
                                <label className="site-form-field">
                                    <span>Longitude</span>
                                    <input type="number" step="any" value={form.site_location_longitude ?? ""} onChange={(event) => setField("site_location_longitude", event.target.value ? Number(event.target.value) : null)} />
                                </label>
                            </div>
                        )}
                    </fieldset>

                    <footer className="site-form-footer">
                        <button type="submit" className="site-primary-button" disabled={saving || optionsLoading}>
                            {saving ? "Saving..." : mode === "create" ? "Save Site" : "Update Site"}
                        </button>
                        <button type="button" className="site-secondary-button" disabled={saving} onClick={closeForm}>Cancel</button>
                    </footer>
                </form>
            )}

            <ConfirmDialog
                open={siteToDelete !== null}
                title="Delete Site?"
                message={siteToDelete ? `Are you sure you want to delete ${siteToDelete.site_name}?` : ""}
                itemName={siteToDelete?.site_name || "this site"}
                confirmText="Delete"
                loading={deletingId !== null}
                onCancel={() => {
                    if (deletingId === null) setSiteToDelete(null);
                }}
                onConfirm={() => {
                    if (siteToDelete) void removeSite(siteToDelete);
                }}
            />
        </ManagementLayout>
    );
}
