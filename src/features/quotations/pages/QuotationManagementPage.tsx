
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type MouseEvent as ReactMouseEvent,
} from "react";

import apiClient from "../../../api/client";
import "./QuotationManagementPage.css";

import { createRoot } from "react-dom/client";
import QuotationPrint from "./QuotationPrint";


import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    createQuotation,
    deleteQuotation,
    getQuotation,
    getQuotations,
    sendQuotationEmail,
    updateQuotation,
    updateQuotationStatus,
    type Quotation,
    type QuotationInput,
    type QuotationStatus,
} from "../api/quotations.api";

type Mode = "create" | "edit";
type ApiRow = Record<string, unknown>;

type CompanyOption = {
    id: number;
    company_name: string;
    name: string;
};

type ClientOption = {
    id: number;
    client_name: string;
    name: string;
};

type CustomerOption = {
    id: number;
    customer_name: string;
    name: string;
    client_id: number | null;
};

type SiteOption = {
    id: number;
    site_name: string;
    customer_id: number | null;
    location_id: number | null;
    location_name: string;
    site_location_mode: string;
    site_location_name: string;
    site_location_address: string;
    site_location_latitude: string;
    site_location_longitude: string;
    site_location_map_url: string;
    vehicle_tracking_reference: string;
    line_1: string;
    line_2: string;
    city: string;
    state: string;
    pin_code: string;
};

type LocationOption = {
    id: number;
    location_name: string;
    name: string;
    location_address?: string;
    location_mode?: string;
    location_latitude?: string;
    location_longitude?: string;
    location_map_url?: string;
};

type ProductOption = {
    id: number;
    product_code: string;
    product_name: string;
    standard_rate: number;
    unit: string;
};

type QuotationLine = {
    product_id: number;
    unit: string;
    quantity: number;
    rate_incl_gst: number;
};

type QuotationForm = Omit<QuotationInput, "items"> & {
    items: QuotationLine[];
};

type ActionMenuPosition = {
    top: number;
    left: number;
};

type SavedQuotationLocation = {
    location_id: number | null;
    location_name: string;
    location_mode: string;
    location_address: string;
    location_latitude: string;
    location_longitude: string;
    location_map_url: string;
    site_location_name: string;
    site_location_address: string;
    site_location_latitude: string;
    site_location_longitude: string;
    site_location_map_url: string;
};

const QUOTATION_STATUSES: QuotationStatus[] = [
    "Draft",
    "Send",
    "Approved",
    "Declined",
];


const PAGE_SIZES = [10, 25, 50, 100];

const ACTION_MENU_WIDTH = 200;
const ACTION_MENU_HEIGHT = 200;
const ACTION_MENU_GAP = 4;
const VIEWPORT_PADDING = 8;

const emptyLine: QuotationLine = {
    product_id: 0,
    unit: "",
    quantity: 1,
    rate_incl_gst: 0,
};

function getLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function createEmptyForm(): QuotationForm {
    const quotationDate = getLocalDate(new Date());

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    return {
        company_id: 0,
        client_id: 0,
        customer_id: 0,
        site_id: 0,
        location_id: 0,
        quotation_date: quotationDate,
        expiry_date: getLocalDate(expiryDate),
        reference: "",
        comment: "Looking forward for your business.",
        items: [{ ...emptyLine }],
    };
}

function getErrorMessage(error: unknown, fallback: string): string {
    const value = error as {
        response?: {
            data?: {
                message?: string;
            };
        };
        message?: string;
    };

    return value.response?.data?.message || value.message || fallback;
}

function toText(value: unknown): string {
    return value == null ? "" : String(value);
}

function toPositiveId(value: unknown): number {
    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function nullableId(value: unknown): number | null {
    return toPositiveId(value) || null;
}

function extractRows(
    value: unknown,
    collectionNames: string[] = []
): ApiRow[] {
    if (Array.isArray(value)) {
        return value as ApiRow[];
    }

    if (!value || typeof value !== "object") {
        return [];
    }

    const root = value as Record<string, unknown>;
    const payload = root.data ?? root;

    if (Array.isArray(payload)) {
        return payload as ApiRow[];
    }

    if (payload && typeof payload === "object") {
        const data = payload as Record<string, unknown>;

        for (const key of [
            ...collectionNames,
            "rows",
            "items",
            "data",
        ]) {
            if (Array.isArray(data[key])) {
                return data[key] as ApiRow[];
            }
        }
    }

    for (const key of [...collectionNames, "rows", "items"]) {
        if (Array.isArray(root[key])) {
            return root[key] as ApiRow[];
        }
    }

    return [];
}

function getRowId(row: ApiRow): number {
    return toPositiveId(
        row.id ??
            row.company_id ??
            row.client_id ??
            row.customer_id ??
            row.site_id ??
            row.location_id ??
            row.product_id
    );
}

function getCompanyName(company: CompanyOption): string {
    return company.company_name || company.name || `Company ${company.id}`;
}

function getClientName(client: ClientOption): string {
    return client.client_name || client.name || `Client ${client.id}`;
}

function getCustomerName(customer: CustomerOption): string {
    return (
        customer.customer_name ||
        customer.name ||
        `Customer ${customer.id}`
    );
}

function getSiteName(site: SiteOption): string {
    return site.site_name || `Site ${site.id}`;
}

function getLocationName(location: LocationOption): string {
    return (
        location.location_name ||
        location.name ||
        `Location ${location.id}`
    );
}

function getProductName(product: ProductOption): string {
    return (
        product.product_name ||
        product.product_code ||
        `Product ${product.id}`
    );
}

function mapCompany(row: ApiRow): CompanyOption {
    return {
        id: getRowId(row),
        company_name: toText(row.company_name ?? row.name),
        name: toText(row.name),
    };
}

function mapClient(row: ApiRow): ClientOption {
    return {
        id: getRowId(row),
        client_name: toText(row.client_name ?? row.name),
        name: toText(row.name),
    };
}

function mapCustomer(row: ApiRow): CustomerOption {
    return {
        id: getRowId(row),
        customer_name: toText(row.customer_name ?? row.name),
        name: toText(row.name),
        client_id: nullableId(row.client_id),
    };
}

function mapSite(row: ApiRow): SiteOption {
    return {
        id: getRowId(row),
        site_name: toText(row.site_name),
        customer_id: nullableId(row.customer_id),
        location_id: nullableId(row.location_id),
        location_name: toText(row.location_name),
        site_location_mode: toText(row.site_location_mode),
        site_location_name: toText(row.site_location_name),
        site_location_address: toText(row.site_location_address),
        site_location_latitude: toText(row.site_location_latitude),
        site_location_longitude: toText(row.site_location_longitude),
        site_location_map_url: toText(row.site_location_map_url),
        vehicle_tracking_reference: toText(
            row.vehicle_tracking_reference
        ),
        line_1: toText(row.line_1),
        line_2: toText(row.line_2),
        city: toText(row.city),
        state: toText(row.state),
        pin_code: toText(row.pin_code),
    };
}

function mapLocation(row: ApiRow): LocationOption {
    return {
        id: getRowId(row),
        location_name: toText(row.location_name ?? row.name),
        name: toText(row.name),
        location_address: toText(
            row.location_address ?? row.address
        ),
        location_mode: toText(row.location_mode ?? row.mode),
        location_latitude: toText(
            row.location_latitude ?? row.latitude
        ),
        location_longitude: toText(
            row.location_longitude ?? row.longitude
        ),
        location_map_url: toText(
            row.location_map_url ?? row.map_url
        ),
    };
}

function mapProduct(row: ApiRow): ProductOption {
    const rate = Number(row.standard_rate ?? 0);

    return {
        id: getRowId(row),
        product_code: toText(row.product_code),
        product_name: toText(row.product_name ?? row.name),
        standard_rate: Number.isFinite(rate) ? rate : 0,
        unit: toText(row.unit ?? row.product_unit),
    };
}

function validOptions<T extends { id: number }>(rows: T[]): T[] {
    return rows.filter((row) => row.id > 0);
}

function getDateInputValue(
    value: string | null | undefined
): string {
    return value ? String(value).slice(0, 10) : "";
}

function formatAmount(
    value: number | string | null | undefined
): string {
    const amount = Number(value ?? 0);

    return (Number.isFinite(amount) ? amount : 0).toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    );
}

function escapeHtml(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character] || character;
    });
}

function getMapUrl(
    savedUrl: unknown,
    latitude: unknown,
    longitude: unknown
): string | null {
    const url = toText(savedUrl).trim();

    if (url) {
        try {
            const parsed = new URL(url);

            if (
                parsed.protocol === "https:" ||
                parsed.protocol === "http:"
            ) {
                return parsed.href;
            }
        } catch {
            // Fall back to coordinates.
        }
    }

    if (
        latitude == null ||
        longitude == null ||
        String(latitude).trim() === "" ||
        String(longitude).trim() === ""
    ) {
        return null;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        return null;
    }

    return `https://www.google.com/maps?q=${lat},${lng}`;
}

function getSiteLocationName(site: SiteOption): string {
    if (site.location_name.trim()) {
        return site.location_name.trim();
    }

    if (site.site_location_name.trim()) {
        return site.site_location_name.trim();
    }

    if (site.site_location_address.trim()) {
        return site.site_location_address.trim();
    }

    if (
        site.site_location_latitude.trim() &&
        site.site_location_longitude.trim()
    ) {
        return `${site.site_location_latitude}, ${site.site_location_longitude}`;
    }

    const address = [
        site.line_1,
        site.line_2,
        site.city,
        site.state,
        site.pin_code,
    ]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(", ");

    return address || "Location not provided";
}

function getQuotationLocationName(quotation: Quotation): string {
    return (
        quotation.location_name?.trim() ||
        quotation.site_location_name?.trim() ||
        quotation.location_address?.trim() ||
        quotation.site_location_address?.trim() ||
        "—"
    );
}

function getQuotationMapUrl(quotation: Quotation): string | null {
    return getMapUrl(
        quotation.location_map_url ||
            quotation.site_location_map_url,
        quotation.location_latitude ??
            quotation.site_location_latitude,
        quotation.location_longitude ??
            quotation.site_location_longitude
    );
}

export default function QuotationManagementPage() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);

    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [sites, setSites] = useState<SiteOption[]>([]);
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);

    const [optionsLoading, setOptionsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingLocation, setAddingLocation] = useState(false);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [statusFilter, setStatusFilter] = useState("All");

    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [mode, setMode] = useState<Mode | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [form, setForm] = useState<QuotationForm>(createEmptyForm);

    const [savedQuotationLocation, setSavedQuotationLocation] =
        useState<SavedQuotationLocation | null>(null);

    const [quotationToDelete, setQuotationToDelete] =
        useState<Quotation | null>(null);

    const [busyId, setBusyId] = useState<number | null>(null);
    const [openActionId, setOpenActionId] = useState<number | null>(null);

    const [showAddLocation, setShowAddLocation] = useState(false);
    const [newLocationName, setNewLocationName] = useState("");

    const [actionMenuPosition, setActionMenuPosition] =
        useState<ActionMenuPosition>({ top: 0, left: 0 });

    const loadQuotations = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getQuotations({
                page,
                limit,
                search: search.trim(),
                status: statusFilter,
            });

            setQuotations(result.data ?? []);
            setTotal(result.pagination?.total ?? 0);
            setTotalPages(
                Math.max(1, result.pagination?.totalPages ?? 1)
            );
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to load quotations.")
            );
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, statusFilter]);

    useEffect(() => {
        void loadQuotations();
    }, [loadQuotations]);

    useEffect(() => {
        let cancelled = false;

        async function loadOptions() {
            setOptionsLoading(true);

            const requests = await Promise.allSettled([
                apiClient.get("api/companies", {
                    params: { page: 1, limit: 500, search: "" },
                }),
                apiClient.get("api/clients", {
                    params: { page: 1, limit: 500, search: "" },
                }),
                apiClient.get("api/customers", {
                    params: { page: 1, limit: 500, search: "" },
                }),
                apiClient.get("api/sites", {
                    params: { page: 1, limit: 500, search: "" },
                }),
                apiClient.get("api/locations", {
                    params: { page: 1, limit: 500, search: "" },
                }),
                apiClient.get("api/products", {
                    params: { page: 1, limit: 500, search: "" },
                }),
            ]);

            if (cancelled) return;

            const rowsAt = (
                index: number,
                names: string[]
            ): ApiRow[] => {
                const request = requests[index];

                return request.status === "fulfilled"
                    ? extractRows(request.value.data, names)
                    : [];
            };

            setCompanies(
                validOptions(rowsAt(0, ["companies"]).map(mapCompany))
            );
            setClients(
                validOptions(rowsAt(1, ["clients"]).map(mapClient))
            );
            setCustomers(
                validOptions(rowsAt(2, ["customers"]).map(mapCustomer))
            );
            setSites(
                validOptions(rowsAt(3, ["sites"]).map(mapSite))
            );
            setLocations(
                validOptions(rowsAt(4, ["locations"]).map(mapLocation))
            );
            setProducts(
                validOptions(rowsAt(5, ["products"]).map(mapProduct))
            );

            if (
                requests.some((request) => request.status === "rejected")
            ) {
                setError(
                    "Some quotation dropdowns could not load. Check the Companies, Clients, Customers, Sites, Locations and Products API routes."
                );
            }

            setOptionsLoading(false);
        }

        void loadOptions().catch((err) => {
            if (cancelled) return;

            setError(
                getErrorMessage(
                    err,
                    "Unable to load quotation dropdowns."
                )
            );
            setOptionsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const visibleCustomers = useMemo(
        () =>
            customers.filter(
                (customer) =>
                    customer.client_id == null ||
                    customer.client_id === Number(form.client_id)
            ),
        [customers, form.client_id]
    );

    const visibleSites = useMemo(
        () =>
            sites.filter(
                (site) =>
                    site.customer_id == null ||
                    site.customer_id === Number(form.customer_id)
            ),
        [sites, form.customer_id]
    );

    const selectedSite = useMemo(
        () =>
            sites.find(
                (site) => site.id === Number(form.site_id)
            ) ?? null,
        [sites, form.site_id]
    );

    const selectedLocation = useMemo(
        () =>
            locations.find(
                (location) =>
                    location.id === Number(form.location_id)
            ) ?? null,
        [locations, form.location_id]
    );

    const selectedSiteMapUrl = useMemo(
        () =>
            selectedSite
                ? getMapUrl(
                      selectedSite.site_location_map_url,
                      selectedSite.site_location_latitude,
                      selectedSite.site_location_longitude
                  )
                : null,
        [selectedSite]
    );

    const selectedLocationMapUrl = useMemo(() => {
        // Zero means "Use Customer Site Location".
        if (!form.location_id) {
            return selectedSiteMapUrl;
        }

        const masterLocationMapUrl = selectedLocation
            ? getMapUrl(
                  selectedLocation.location_map_url,
                  selectedLocation.location_latitude,
                  selectedLocation.location_longitude
              )
            : null;

        if (masterLocationMapUrl) {
            return masterLocationMapUrl;
        }

        // Retain saved quotation map information when editing.
        if (
            savedQuotationLocation?.location_id ===
            Number(form.location_id)
        ) {
            return getMapUrl(
                savedQuotationLocation.location_map_url,
                savedQuotationLocation.location_latitude,
                savedQuotationLocation.location_longitude
            );
        }

        return null;
    }, [
        form.location_id,
        selectedSiteMapUrl,
        selectedLocation,
        savedQuotationLocation,
    ]);

    const selectedLocationName = useMemo(() => {
        if (!form.location_id) {
            return selectedSite
                ? getSiteLocationName(selectedSite)
                : "Select a customer site to view its location.";
        }

        if (selectedLocation) {
            return getLocationName(selectedLocation);
        }

        if (
            savedQuotationLocation?.location_id ===
            Number(form.location_id)
        ) {
            return (
                savedQuotationLocation.location_name ||
                `Location ${form.location_id}`
            );
        }

        return `Location ${form.location_id}`;
    }, [
        form.location_id,
        selectedSite,
        selectedLocation,
        savedQuotationLocation,
    ]);

    const totalAmount = useMemo(
        () =>
            Math.round(
                form.items.reduce(
                    (sum, item) =>
                        sum +
                        Number(item.quantity || 0) *
                            Number(item.rate_incl_gst || 0),
                    0
                ) * 100
            ) / 100,
        [form.items]
    );

    function setFormField<K extends keyof QuotationForm>(
        field: K,
        value: QuotationForm[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function resetAddLocation() {
        setShowAddLocation(false);
        setNewLocationName("");
    }

    function resetForm() {
        setForm(createEmptyForm());
        setSelectedId(null);
        setSavedQuotationLocation(null);
        setMode(null);
        setError("");
        setOpenActionId(null);
        resetAddLocation();
    }

    function handleAddQuotation() {
        setError("");
        setNotice("");
        setSelectedId(null);
        setSavedQuotationLocation(null);
        setForm(createEmptyForm());
        resetAddLocation();
        setMode("create");
    }

    async function handleEditQuotation(quotation: Quotation) {
        setError("");
        setNotice("");
        setOpenActionId(null);
        resetAddLocation();

        try {
            const result = await getQuotation(quotation.id);

            const loadedItems: QuotationLine[] = (
                result.items ?? []
            ).map((item) => ({
                product_id: Number(item.product_id),
                unit: item.unit ?? "",
                quantity: Number(item.quantity),
                rate_incl_gst: Number(item.rate_incl_gst),
            }));

            const savedLocationId = nullableId(result.location_id);

            setSavedQuotationLocation({
                location_id: savedLocationId,
                location_name: toText(result.location_name),
                location_mode: toText(result.location_mode),
                location_address: toText(result.location_address),
                location_latitude: toText(result.location_latitude),
                location_longitude: toText(result.location_longitude),
                location_map_url: toText(result.location_map_url),
                site_location_name: toText(result.site_location_name),
                site_location_address: toText(
                    result.site_location_address
                ),
                site_location_latitude: toText(
                    result.site_location_latitude
                ),
                site_location_longitude: toText(
                    result.site_location_longitude
                ),
                site_location_map_url: toText(
                    result.site_location_map_url
                ),
            });

            setForm({
                company_id: Number(result.company_id),
                client_id: Number(result.client_id),
                customer_id: Number(result.customer_id || 0),
                site_id: Number(result.site_id || 0),
                location_id: savedLocationId || 0,
                quotation_date: getDateInputValue(
                    result.quotation_date
                ),
                expiry_date: getDateInputValue(result.expiry_date),
                reference: result.reference || "",
                comment: result.comment || "",
                items: loadedItems.length
                    ? loadedItems
                    : [{ ...emptyLine }],
            });

            setSelectedId(result.id);
            setMode("edit");
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to load quotation details."
                )
            );
        }
    }

    function updateLine(
        index: number,
        field: keyof QuotationLine,
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            items: previous.items.map((line, lineIndex) => {
                if (lineIndex !== index) return line;

                if (field === "product_id") {
                    const productId = toPositiveId(value);
                    const product = products.find(
                        (item) => item.id === productId
                    );

                    return {
                        ...line,
                        product_id: productId,
                        unit: product?.unit || line.unit,
                        rate_incl_gst:
                            product != null
                                ? product.standard_rate
                                : line.rate_incl_gst,
                    };
                }

                if (field === "unit") {
                    return { ...line, unit: value };
                }

                return {
                    ...line,
                    [field]: value === "" ? 0 : Number(value),
                };
            }),
        }));
    }

    function addItemRow() {
        setForm((previous) => ({
            ...previous,
            items: [...previous.items, { ...emptyLine }],
        }));
    }

    function removeItemRow(index: number) {
        setForm((previous) => ({
            ...previous,
            items:
                previous.items.length <= 1
                    ? previous.items
                    : previous.items.filter(
                          (_, lineIndex) => lineIndex !== index
                      ),
        }));
    }

    async function handleAddLocation() {
        const locationName = newLocationName.trim();

        if (!locationName) {
            setError("Please enter a location name.");
            return;
        }

        const duplicate = locations.find(
            (location) =>
                getLocationName(location).toLowerCase() ===
                locationName.toLowerCase()
        );

        if (duplicate) {
            setFormField("location_id", duplicate.id);
            resetAddLocation();
            setError("");
            setNotice(
                `"${getLocationName(duplicate)}" already exists and has been selected.`
            );
            return;
        }

        setAddingLocation(true);
        setError("");
        setNotice("");

        try {
            const response = await apiClient.post("api/locations", {
                location_name: locationName,
            });

            const rows = extractRows(response.data, [
                "locations",
                "location",
            ]);

            const root =
                response.data && typeof response.data === "object"
                    ? (response.data as Record<string, unknown>)
                    : {};

            const nested =
                root.data && typeof root.data === "object"
                    ? (root.data as Record<string, unknown>)
                    : root;

            const returnedRow = rows[0] ?? nested;
            let createdLocation = mapLocation(returnedRow);

            if (!createdLocation.id) {
                const refresh = await apiClient.get("api/locations", {
                    params: { page: 1, limit: 500, search: "" },
                });

                const refreshed = validOptions(
                    extractRows(refresh.data, ["locations"]).map(
                        mapLocation
                    )
                );

                setLocations(refreshed);

                createdLocation =
                    refreshed.find(
                        (location) =>
                            getLocationName(location).toLowerCase() ===
                            locationName.toLowerCase()
                    ) ?? {
                        id: 0,
                        location_name: "",
                        name: "",
                    };
            }

            if (!createdLocation.id) {
                setError(
                    "The location was submitted, but its ID could not be identified. Check the POST /api/locations response."
                );
                return;
            }

            setLocations((previous) => [
                ...previous.filter(
                    (location) =>
                        location.id !== createdLocation.id
                ),
                createdLocation,
            ]);

            setFormField("location_id", createdLocation.id);
            resetAddLocation();
            setNotice("Location added and selected successfully.");
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to add location. Check the POST /api/locations request format."
                )
            );
        } finally {
            setAddingLocation(false);
        }
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setError("");
        setNotice("");

        if (!form.company_id || !form.client_id) {
            setError("Please select Company and Client.");
            return;
        }

        if (
            !form.items.length ||
            form.items.some(
                (item) =>
                    !item.product_id ||
                    !item.unit.trim() ||
                    !Number.isFinite(item.quantity) ||
                    item.quantity <= 0 ||
                    !Number.isFinite(item.rate_incl_gst) ||
                    item.rate_incl_gst < 0
            )
        ) {
            setError(
                "Complete every item with a Product, Unit, valid Quantity and Rate."
            );
            return;
        }

        if (
            !form.quotation_date ||
            !form.expiry_date ||
            form.expiry_date < form.quotation_date
        ) {
            setError("Expiry Date cannot be before Quotation Date.");
            return;
        }

        if (!form.reference.trim() || !form.comment.trim()) {
            setError("Reference and Comment are required.");
            return;
        }

        if (mode === "edit" && selectedId == null) {
            setError("Select a quotation to update.");
            return;
        }

        setSaving(true);

        try {
            const payload: QuotationInput = {
                ...form,
                company_id: Number(form.company_id),
                client_id: Number(form.client_id),
                customer_id: nullableId(form.customer_id),
                site_id: nullableId(form.site_id),

                // Null means "Use Customer Site Location".
                location_id: nullableId(form.location_id),

                reference: form.reference.trim(),
                comment: form.comment.trim(),
                items: form.items.map((item) => ({
                    ...item,
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity),
                    rate_incl_gst: Number(item.rate_incl_gst),
                })),
            };

            if (mode === "create") {
                await createQuotation(payload);
            } else {
                await updateQuotation(selectedId!, payload);
            }

            const message =
                mode === "create"
                    ? "Quotation created successfully."
                    : "Quotation updated successfully.";

            resetForm();
            await loadQuotations();
            setNotice(message);
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to save quotation.")
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleStatusChange(
        quotation: Quotation,
        status: QuotationStatus
    ) {
        if (status === quotation.status) return;

        setBusyId(quotation.id);
        setError("");
        setNotice("");

        try {
            await updateQuotationStatus(quotation.id, status);
            await loadQuotations();

            setNotice(
                `${quotation.quotation_no} status updated to ${status}.`
            );
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to update quotation status.")
            );
            await loadQuotations();
        } finally {
            setBusyId(null);
        }
    }

    async function handleDeleteQuotation() {
        if (!quotationToDelete) return;

        const deleting = quotationToDelete;

        setBusyId(deleting.id);
        setError("");

        try {
            await deleteQuotation(deleting.id);

            setQuotationToDelete(null);
            setOpenActionId(null);

            if (quotations.length === 1 && page > 1) {
                setPage((previous) => previous - 1);
            } else {
                await loadQuotations();
            }

            setNotice("Quotation deleted successfully.");
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to delete quotation.")
            );
        } finally {
            setBusyId(null);
        }
    }

    async function handleSendEmail(quotation: Quotation) {
        setBusyId(quotation.id);
        setOpenActionId(null);
        setError("");
        setNotice("");

        try {
            await sendQuotationEmail(quotation.id);
            setNotice("Quotation email request completed.");
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Quotation email sending is not configured."
                )
            );
        } finally {
            setBusyId(null);
        }
    }

async function handlePrintQuotation(quotation: Quotation) {
    setError("");
    setOpenActionId(null);

    const printWindow = window.open(
        "",
        "_blank",
        "width=1000,height=750"
    );

    if (!printWindow) {
        setError("Allow pop-ups in your browser to print the quotation.");
        return;
    }

    try {
        const result = await getQuotation(quotation.id);

        printWindow.document.open();
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    />
                    <title>Quotation ${result.quotation_no ?? ""}</title>
                </head>
                <body>
                    <div id="quotation-print-root"></div>
                </body>
            </html>
        `);
        printWindow.document.close();

        // Copy stylesheets and inline styles from the main app.
        const sourceStyles = Array.from(
            document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
                'style, link[rel="stylesheet"]'
            )
        );

        const stylePromises: Promise<void>[] = [];

        sourceStyles.forEach((source) => {
            const cloned = source.cloneNode(true) as
                | HTMLStyleElement
                | HTMLLinkElement;

            if (cloned.tagName === "LINK") {
                const promise = new Promise<void>((resolve) => {
                    cloned.onload = () => resolve();
                    cloned.onerror = () => resolve();
                });

                stylePromises.push(promise);
            }

            printWindow.document.head.appendChild(cloned);
        });

        await Promise.all(stylePromises);

        const rootElement =
            printWindow.document.getElementById("quotation-print-root");

        if (!rootElement) {
            throw new Error("Quotation print container was not created.");
        }

        const printRoot = createRoot(rootElement);

        printRoot.render(
            <QuotationPrint
                autoPrint={false}
                quotation={{
                    ...result,
                    reference_no: result.reference ?? "",
                    location_name: result.location_name ?? "",
                    location_address: result.location_address ?? "",
                    location_map_url:
                        result.location_map_url ??
                        result.site_location_map_url ??
                        "",
                    items: result.items ?? [],
                }}
                company={{
                    company_name:
                        result.company_name ||
                        "A S Building Solutions Pvt Ltd",
                    company_logo: result.company_logo ?? "",
                }}
                client={{
                    client_name:
                        result.client_name ?? result.customer_name ?? "",
                    address: result.customer_address ?? "",
                    gstin: result.customer_gstin ?? "",
                }}
            />
        );

        // Wait for React to render and allow the browser to apply the styles.
        window.setTimeout(() => {
            if (!printWindow.closed) {
                printWindow.focus();
                printWindow.print();
            }
        }, 1000);
    } catch (error) {
        console.error("Failed to print quotation:", error);

        if (!printWindow.closed) {
            printWindow.close();
        }

        setError("Unable to print quotation. Please try again.");
    }
}

    function toggleActionMenu(
        event: ReactMouseEvent<HTMLButtonElement>,
        quotationId: number
    ) {
        event.stopPropagation();

        if (openActionId === quotationId) {
            setOpenActionId(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        const openAbove =
            window.innerHeight - rect.bottom < ACTION_MENU_HEIGHT &&
            rect.top > ACTION_MENU_HEIGHT;

        const top = openAbove
            ? rect.top - ACTION_MENU_HEIGHT - ACTION_MENU_GAP
            : rect.bottom + ACTION_MENU_GAP;

        const left = Math.max(
            VIEWPORT_PADDING,
            Math.min(
                rect.right - ACTION_MENU_WIDTH,
                window.innerWidth -
                    ACTION_MENU_WIDTH -
                    VIEWPORT_PADDING
            )
        );

        setActionMenuPosition({ top, left });
        setOpenActionId(quotationId);
    }

    const startEntry =
        total === 0 ? 0 : (page - 1) * limit + 1;

    const endEntry = Math.min(
        (page - 1) * limit + quotations.length,
        total
    );

    const toolbar =
        mode === null ? (
            <div className="quotation-toolbar">
                <div className="quotation-toolbar__group quotation-toolbar__entries">
                    <label htmlFor="quotation-limit">Show</label>
                    <select
                        id="quotation-limit"
                        value={limit}
                        onChange={(event) => {
                            setLimit(Number(event.target.value));
                            setPage(1);
                        }}
                    >
                        {PAGE_SIZES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                    <span>entries</span>
                </div>

                <div className="quotation-toolbar__right">
                    <div className="quotation-toolbar__group">
                        <label htmlFor="quotation-status">Status</label>
                        <select
                            id="quotation-status"
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="All">All</option>
                            {QUOTATION_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="quotation-toolbar__group quotation-toolbar__search">
                        <label htmlFor="quotation-search">Search:</label>
                        <input
                            id="quotation-search"
                            type="search"
                            value={search}
                            placeholder="Search quotations..."
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
            </div>
        ) : null;

    const pagination =
        mode === null ? (
            <div className="quotation-pagination">
                <span>
                    Showing {startEntry} to {endEntry} of {total} entries
                </span>

                <div className="quotation-pagination__actions">
                    <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() =>
                            setPage((previous) =>
                                Math.max(1, previous - 1)
                            )
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
                            setPage((previous) =>
                                Math.min(totalPages, previous + 1)
                            )
                        }
                    >
                        Next
                    </button>
                </div>
            </div>
        ) : null;

    return (
        <ManagementLayout
            title="Manage Quotation"
            description="Manage your customer quotations."
            showForm={mode !== null}
            listTitle="Our Quotation List"
            addButtonText="Add Quotation"
            onAdd={handleAddQuotation}
            onBack={resetForm}
            formTitle={
                mode === "edit" ? "Edit Quotation" : "Add Quotation"
            }
            toolbar={toolbar}
            pagination={pagination}
            error={error}
            notice={notice}
        >
            {mode === null ? (
                <div
                    className="quotation-table-wrapper"
                    onClick={(event) => {
                        const target = event.target as HTMLElement;

                        if (
                            !target.closest(".quotation-action-dropdown") &&
                            !target.closest(".quotation-action-trigger")
                        ) {
                            setOpenActionId(null);
                        }
                    }}
                >
                    <table className="quotation-table">
                        <thead>
                            <tr>
                                <th>QTNO</th>
                                <th>Company</th>
                                <th>Client</th>
                                <th>Customer</th>
                                <th>Location</th>
                                <th>Amt</th>
                                <th>Action</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="quotation-empty"
                                    >
                                        Loading quotations...
                                    </td>
                                </tr>
                            ) : quotations.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="quotation-empty"
                                    >
                                        No quotations found.
                                    </td>
                                </tr>
                            ) : (
                                quotations.map((quotation) => {
                                    const mapUrl =
                                        getQuotationMapUrl(quotation);

                                    return (
                                        <tr key={quotation.id}>
                                            <td>{quotation.quotation_no}</td>
                                            <td>{quotation.company_name || "—"}</td>
                                            <td>{quotation.client_name || "—"}</td>
                                            <td>{quotation.customer_name || "—"}</td>


<td>
    {quotation.location_id ? (
        <span>
            {quotation.location_name?.trim() ||
                "Location name unavailable"}
        </span>
    ) : mapUrl ? (
        <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="quotation-location__map-link"
            aria-label={`View map for ${quotation.quotation_no}`}
        >
            <i
                className="bi bi-geo-alt-fill"
                aria-hidden="true"
            />
            View Map
        </a>
    ) : (
        <span>Customer Site Location</span>
    )}
</td>

                                            <td className="quotation-amount">
                                                {formatAmount(
                                                    quotation.grand_total
                                                )}
                                            </td>

                                            <td>
                                                <div className="quotation-row-actions">
                                                    <button
                                                        type="button"
                                                        className="quotation-action-trigger"
                                                        aria-expanded={
                                                            openActionId ===
                                                            quotation.id
                                                        }
                                                        aria-label={`Actions for ${quotation.quotation_no}`}
                                                        onClick={(event) =>
                                                            toggleActionMenu(
                                                                event,
                                                                quotation.id
                                                            )
                                                        }
                                                    >
                                                        <span>Actions</span>
                                                        <i
                                                            className="bi bi-chevron-down action-chevron"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                </div>
                                            </td>

                                            <td>
                                                <select
                                                    aria-label={`Status for ${quotation.quotation_no}`}
                                                    value={quotation.status}
                                                    disabled={
                                                        busyId === quotation.id
                                                    }
                                                    onChange={(event) =>
                                                        void handleStatusChange(
                                                            quotation,
                                                            event.target
                                                                .value as QuotationStatus
                                                        )
                                                    }
                                                >
                                                    {QUOTATION_STATUSES.map(
                                                        (status) => (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {status}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {openActionId !== null && (
                        <div
                            className="quotation-action-dropdown"
                            style={{
                                position: "fixed",
                                top: actionMenuPosition.top,
                                left: actionMenuPosition.left,
                            }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            {(() => {
                                const quotation = quotations.find(
                                    (item) => item.id === openActionId
                                );

                                if (!quotation) return null;

                                return (
                                    <>
<button
    type="button"
    className="quotation-menu-item print-action"
    onClick={() => void handlePrintQuotation(quotation)}
>
    <i
        className="bi bi-printer-fill"
        aria-hidden="true"
    />
    <span>Print Quotation</span>
</button>

                                        <button
                                            type="button"
                                            className="quotation-menu-item email-action"
                                            disabled={
                                                busyId === quotation.id
                                            }
                                            onClick={() =>
                                                void handleSendEmail(
                                                    quotation
                                                )
                                            }
                                        >
                                            <i
                                                className="bi bi-envelope-fill"
                                                aria-hidden="true"
                                            />
                                            <span>Send Email</span>
                                        </button>

                                        {quotation.status === "Draft" && (
                                            <div className="quotation-menu-action edit-action">
                                                <ActionButton
                                                    action="edit"
                                                    type="button"
                                                    title="Edit Quotation"
                                                    onClick={() => {
                                                        setOpenActionId(null);
                                                        void handleEditQuotation(
                                                            quotation
                                                        );
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <div className="quotation-menu-action delete-action">
                                            <ActionButton
                                                action="delete"
                                                type="button"
                                                title="Delete Quotation"
                                                onClick={() => {
                                                    setOpenActionId(null);
                                                    setQuotationToDelete(
                                                        quotation
                                                    );
                                                }}
                                            />
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            ) : (
                <form
                    className="quotation-form"
                    onSubmit={handleSubmit}
                >
                    <fieldset
                        disabled={
                            saving || optionsLoading || addingLocation
                        }
                    >
                        <legend>Quotation</legend>

                        <p className="quotation-form__description">
                            You can add or update a quotation here.
                        </p>

                        {optionsLoading && (
                            <p className="quotation-loading-options">
                                Loading quotation options...
                            </p>
                        )}

                        <div className="quotation-form__grid">
                            <label>
                                <span>Select Company *</span>
                                <select
                                    required
                                    value={form.company_id || ""}
                                    onChange={(event) =>
                                        setFormField(
                                            "company_id",
                                            Number(event.target.value) || 0
                                        )
                                    }
                                >
                                    <option value="">Select Company</option>
                                    {companies.map((company) => (
                                        <option
                                            key={company.id}
                                            value={company.id}
                                        >
                                            {getCompanyName(company)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Select Client *</span>
                                <select
                                    required
                                    value={form.client_id || ""}
                                    onChange={(event) => {
                                        const clientId =
                                            Number(event.target.value) || 0;

                                        setForm((previous) => ({
                                            ...previous,
                                            client_id: clientId,
                                            customer_id: 0,
                                            site_id: 0,
                                            location_id: 0,
                                        }));
                                        setSavedQuotationLocation(null);
                                    }}
                                >
                                    <option value="">Select Client</option>
                                    {clients.map((client) => (
                                        <option
                                            key={client.id}
                                            value={client.id}
                                        >
                                            {getClientName(client)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Select Customer</span>
                                <select
                                    value={form.customer_id || ""}
                                    onChange={(event) => {
                                        const customerId =
                                            Number(event.target.value) || 0;

                                        setForm((previous) => ({
                                            ...previous,
                                            customer_id: customerId,
                                            site_id: 0,
                                            location_id: 0,
                                        }));
                                        setSavedQuotationLocation(null);
                                    }}
                                >
                                    <option value="">Select Customer</option>
                                    {visibleCustomers.map((customer) => (
                                        <option
                                            key={customer.id}
                                            value={customer.id}
                                        >
                                            {getCustomerName(customer)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Customer Site Name</span>
                                <select
                                    value={form.site_id || ""}
                                    onChange={(event) => {
                                        const siteId =
                                            Number(event.target.value) || 0;

                                        // Reset the location selection to the
                                        // customer site's own location.
                                        setForm((previous) => ({
                                            ...previous,
                                            site_id: siteId,
                                            location_id: 0,
                                        }));
                                        setSavedQuotationLocation(null);
                                    }}
                                >
                                    <option value="">
                                        Select Customer Site
                                    </option>

                                    {visibleSites.map((site) => (
                                        <option
                                            key={site.id}
                                            value={site.id}
                                        >
                                            {getSiteName(site)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="quotation-location-field">
                                <label>
                                    <span>Select Location</span>
                                    <select
                                        value={form.location_id || ""}
                                        onChange={(event) => {
                                            const locationId =
                                                Number(event.target.value) || 0;

                                            setFormField(
                                                "location_id",
                                                locationId
                                            );
                                        }}
                                    >
                                        <option value="">
                                            Use Customer Site Location
                                        </option>

                                        {locations.map((location) => (
                                            <option
                                                key={location.id}
                                                value={location.id}
                                            >
                                                {getLocationName(location)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {/* <button
                                    type="button"
                                    className="quotation-add-location-button"
                                    onClick={() => {
                                        setError("");
                                        setNotice("");
                                        setShowAddLocation((previous) => !previous);
                                        setNewLocationName("");
                                    }}
                                >
                                    <i
                                        className="bi bi-plus-circle"
                                        aria-hidden="true"
                                    />
                                    Add Location
                                </button> */}

                                {showAddLocation && (
                                    <div className="quotation-add-location-panel">
                                        <label>
                                            <span>New Location Name *</span>
                                            <input
                                                type="text"
                                                value={newLocationName}
                                                maxLength={150}
                                                placeholder="Enter location name"
                                                onChange={(event) =>
                                                    setNewLocationName(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        <div className="quotation-add-location-actions">
                                            <button
                                                type="button"
                                                disabled={
                                                    addingLocation ||
                                                    !newLocationName.trim()
                                                }
                                                onClick={() =>
                                                    void handleAddLocation()
                                                }
                                            >
                                                {addingLocation
                                                    ? "Adding..."
                                                    : "Save Location"}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={addingLocation}
                                                onClick={resetAddLocation}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                               
{!form.location_id ? (
    <div className="quotation-site-location">
        <strong>Customer Site Location</strong>

        <span>{selectedLocationName}</span>

        {selectedSite && (
            <>
                {selectedSiteMapUrl ? (
                    <a
                        href={selectedSiteMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="quotation-location__map-link"
                    >
                        <i
                            className="bi bi-geo-alt-fill"
                            aria-hidden="true"
                        />
                        View Map
                        <i
                            className="bi bi-box-arrow-up-right"
                            aria-hidden="true"
                        />
                    </a>
                ) : (
                    <span className="quotation-location__no-map">
                        Map location is not available for this site.
                    </span>
                )}

                {selectedSite.site_location_mode && (
                    <span>
                        Location type:{" "}
                        {selectedSite.site_location_mode}
                    </span>
                )}

                {selectedSite.vehicle_tracking_reference && (
                    <span>
                        Tracking reference:{" "}
                        {selectedSite.vehicle_tracking_reference}
                    </span>
                )}
            </>
        )}
    </div>
) : (
    <div className="quotation-site-location">
        <strong>Selected Location</strong>
        <span>{selectedLocationName}</span>
    </div>
)}

                            </div>

                            <label>
                                <span>Quotation Date *</span>
                                <input
                                    type="date"
                                    required
                                    value={form.quotation_date}
                                    onChange={(event) =>
                                        setFormField(
                                            "quotation_date",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Expiry Date *</span>
                                <input
                                    type="date"
                                    required
                                    min={form.quotation_date}
                                    value={form.expiry_date}
                                    onChange={(event) =>
                                        setFormField(
                                            "expiry_date",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Reference *</span>
                                <input
                                    type="text"
                                    required
                                    maxLength={200}
                                    value={form.reference}
                                    placeholder="Reference"
                                    onChange={(event) =>
                                        setFormField(
                                            "reference",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="quotation-form__comment">
                                <span>Comment *</span>
                                <textarea
                                    required
                                    rows={3}
                                    maxLength={5000}
                                    value={form.comment}
                                    onChange={(event) =>
                                        setFormField(
                                            "comment",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="quotation-items-heading">
                            <h3>Items *</h3>
                            <button type="button" onClick={addItemRow}>
                                <i
                                    className="bi bi-plus-circle"
                                    aria-hidden="true"
                                />
                                Add Item
                            </button>
                        </div>

                        <div className="quotation-table-wrapper">
                            <table className="quotation-items-table">
                                <thead>
                                    <tr>
                                        <th>Product *</th>
                                        <th>Unit *</th>
                                        <th>Quantity *</th>
                                        <th>Rate (Incl GST) *</th>
                                        <th>Amount *</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {form.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <select
                                                    required
                                                    value={item.product_id || ""}
                                                    onChange={(event) =>
                                                        updateLine(
                                                            index,
                                                            "product_id",
                                                            event.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Select Product
                                                    </option>
                                                    {products.map((product) => (
                                                        <option
                                                            key={product.id}
                                                            value={product.id}
                                                        >
                                                            {getProductName(product)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td>
                                                <input
                                                    required
                                                    value={item.unit}
                                                    maxLength={30}
                                                    placeholder="Unit"
                                                    onChange={(event) =>
                                                        updateLine(
                                                            index,
                                                            "unit",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <input
                                                    required
                                                    type="number"
                                                    min="0.001"
                                                    step="0.001"
                                                    value={item.quantity}
                                                    onChange={(event) =>
                                                        updateLine(
                                                            index,
                                                            "quantity",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <input
                                                    required
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.rate_incl_gst}
                                                    onChange={(event) =>
                                                        updateLine(
                                                            index,
                                                            "rate_incl_gst",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </td>

                                            <td className="quotation-amount">
                                                {formatAmount(
                                                    item.quantity *
                                                        item.rate_incl_gst
                                                )}
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="quotation-remove-item"
                                                    disabled={
                                                        form.items.length === 1
                                                    }
                                                    onClick={() =>
                                                        removeItemRow(index)
                                                    }
                                                >
                                                    <i
                                                        className="bi bi-trash"
                                                        aria-hidden="true"
                                                    />
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="quotation-totals">
                            <p>
                                <span>TOTAL</span>
                                <strong>
                                    ₹ {formatAmount(totalAmount)}
                                </strong>
                            </p>
                            <p>
                                <span>GRAND TOTAL</span>
                                <strong>
                                    ₹ {formatAmount(totalAmount)}
                                </strong>
                            </p>
                        </div>
                    </fieldset>

                    <div className="quotation-form__footer">
                        <button
                            type="submit"
                            disabled={
                                saving || optionsLoading || addingLocation
                            }
                        >
                            {saving
                                ? "Saving..."
                                : mode === "edit"
                                  ? "Update Quotation"
                                  : "Save Quotation"}
                        </button>

                        <button
                            type="button"
                            disabled={saving || addingLocation}
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <ConfirmDialog
                open={quotationToDelete !== null}
                title="Delete Quotation?"
                message={
                    quotationToDelete
                        ? `Are you sure you want to delete ${quotationToDelete.quotation_no}? This action cannot be undone.`
                        : ""
                }
                itemName={
                    quotationToDelete?.quotation_no || "this quotation"
                }
                confirmText="Delete"
                loading={busyId !== null}
                onCancel={() => {
                    if (busyId === null) {
                        setQuotationToDelete(null);
                    }
                }}
                onConfirm={() => void handleDeleteQuotation()}
            />
        </ManagementLayout>
    );
}
