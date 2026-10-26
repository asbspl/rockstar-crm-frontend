import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

import apiClient from "../../../api/client";
import "./RateMatrixManagementPage.css";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    createRateMatrix,
    deleteRateMatrix,
    getRateMatrix,
    getRateMatrices,
    updateRateMatrix,
    type RateMatrix,
    type RateMatrixInput,
} from "../api/rate-matrix.api";

type Mode = "create" | "edit";

type ClientOption = {
    id: number;
    client_name?: string;
    name?: string;
};

type CustomerOption = {
    id: number;
    customer_name?: string;
    name?: string;
    client_id?: number | string | null;
};

type SiteOption = {
    id: number;
    site_name?: string;
    customer_id?: number | string | null;
    location_id?: number | string | null;
};

type LocationOption = {
    id: number;
    location_name?: string;
    name?: string;
};

type ProductOption = {
    id: number;
    product_code?: string;
    product_name?: string;
    standard_rate?: number | string;
};

type OptionRow = Record<string, unknown>;

const emptyForm: RateMatrixInput = {
    client_id: 0,
    customer_id: 0,
    site_id: 0,
    location_id: 0,
    product_id: 0,
    rate: 0,
};

function getErrorMessage(
    error: unknown,
    fallback: string
): string {
    const value = error as {
        response?: {
            data?: {
                message?: string;
            };
        };
        message?: string;
    };

    return (
        value.response?.data?.message ||
        value.message ||
        fallback
    );
}

function extractRows(
    value: unknown,
    collectionNames: string[]
): OptionRow[] {
    if (Array.isArray(value)) {
        return value as OptionRow[];
    }

    if (!value || typeof value !== "object") {
        return [];
    }

    const root = value as Record<string, unknown>;
    const payload = root.data ?? root;

    if (Array.isArray(payload)) {
        return payload as OptionRow[];
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
                return data[key] as OptionRow[];
            }
        }
    }

    for (const key of [
        ...collectionNames,
        "rows",
        "items",
    ]) {
        if (Array.isArray(root[key])) {
            return root[key] as OptionRow[];
        }
    }

    return [];
}

function optionId(row: OptionRow): number {
    return Number(
        row.id ??
        row.client_id ??
        row.customer_id ??
        row.site_id ??
        row.location_id ??
        row.product_id
    );
}

function getClientName(client: ClientOption): string {
    return (
        client.client_name ||
        client.name ||
        `Client ${client.id}`
    );
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

function formatRate(rate: number | string): string {
    const amount = Number(rate);

    return Number.isFinite(amount)
        ? amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : "0.00";
}

export default function RateMatrixManagementPage() {
    const [rateMatrices, setRateMatrices] = useState<RateMatrix[]>(
        []
    );

    const [clients, setClients] = useState<ClientOption[]>([]);
    const [customers, setCustomers] = useState<CustomerOption[]>(
        []
    );
    const [sites, setSites] = useState<SiteOption[]>([]);
    const [locations, setLocations] = useState<LocationOption[]>(
        []
    );
    const [products, setProducts] = useState<ProductOption[]>([]);

    const [optionsLoading, setOptionsLoading] = useState(true);

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
    const [selectedId, setSelectedId] = useState<number | null>(
        null
    );
    const [form, setForm] = useState<RateMatrixInput>({
        ...emptyForm,
    });

    const [rateMatrixToDelete, setRateMatrixToDelete] =
        useState<RateMatrix | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(
        null
    );

    const loadRateMatrices = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getRateMatrices({
                page,
                limit,
                search,
            });

            setRateMatrices(result.data ?? []);
            setTotal(result.pagination?.total ?? 0);
            setTotalPages(
                Math.max(1, result.pagination?.totalPages ?? 1)
            );
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to load Rate Matrix records."
                )
            );
        } finally {
            setLoading(false);
        }
    }, [page, limit, search]);

    useEffect(() => {
        void loadRateMatrices();
    }, [loadRateMatrices]);

    useEffect(() => {
        let cancelled = false;

        async function loadOptions() {
            setOptionsLoading(true);

            try {
                const results = await Promise.allSettled([
                    apiClient.get("api/clients", {
                        params: {
                            page: 1,
                            limit: 500,
                            search: "",
                        },
                    }),
                    apiClient.get("api/customers", {
                        params: {
                            page: 1,
                            limit: 500,
                            search: "",
                        },
                    }),
                    apiClient.get("api/sites", {
                        params: {
                            page: 1,
                            limit: 500,
                            search: "",
                        },
                    }),
                    apiClient.get("api/locations", {
                        params: {
                            page: 1,
                            limit: 500,
                            search: "",
                        },
                    }),
                    apiClient.get("api/products", {
                        params: {
                            page: 1,
                            limit: 500,
                            search: "",
                        },
                    }),
                ]);

                if (cancelled) return;

                const [
                    clientResponse,
                    customerResponse,
                    siteResponse,
                    locationResponse,
                    productResponse,
                ] = results;

                if (clientResponse.status === "fulfilled") {
                    const rows = extractRows(
                        clientResponse.value.data,
                        ["clients"]
                    );

                    setClients(
                        rows
                            .map((row) => ({
                                id: optionId(row),
                                client_name: String(
                                    row.client_name ??
                                    row.name ??
                                    ""
                                ),
                                name: String(row.name ?? ""),
                            }))
                            .filter(
                                (row) =>
                                    Number.isSafeInteger(row.id) &&
                                    row.id > 0
                            )
                    );
                }

                if (customerResponse.status === "fulfilled") {
                    const rows = extractRows(
                        customerResponse.value.data,
                        ["customers"]
                    );

                    setCustomers(
                        rows
                            .map((row) => ({
                                id: optionId(row),
                                customer_name: String(
                                    row.customer_name ??
                                    row.name ??
                                    ""
                                ),
                                name: String(row.name ?? ""),
                                client_id:
                                    row.client_id == null
                                        ? null
                                        : Number(row.client_id),
                            }))
                            .filter(
                                (row) =>
                                    Number.isSafeInteger(row.id) &&
                                    row.id > 0
                            )
                    );
                }

                if (siteResponse.status === "fulfilled") {
                    const rows = extractRows(
                        siteResponse.value.data,
                        ["sites"]
                    );

                    setSites(
                        rows
                            .map((row) => ({
                                id: optionId(row),
                                site_name: String(
                                    row.site_name ?? ""
                                ),
                                customer_id:
                                    row.customer_id == null
                                        ? null
                                        : Number(row.customer_id),
                                location_id:
                                    row.location_id == null
                                        ? null
                                        : Number(row.location_id),
                            }))
                            .filter(
                                (row) =>
                                    Number.isSafeInteger(row.id) &&
                                    row.id > 0
                            )
                    );
                }

                if (locationResponse.status === "fulfilled") {
                    const rows = extractRows(
                        locationResponse.value.data,
                        ["locations"]
                    );

                    setLocations(
                        rows
                            .map((row) => ({
                                id: optionId(row),
                                location_name: String(
                                    row.location_name ??
                                    row.name ??
                                    ""
                                ),
                                name: String(row.name ?? ""),
                            }))
                            .filter(
                                (row) =>
                                    Number.isSafeInteger(row.id) &&
                                    row.id > 0
                            )
                    );
                }

                if (productResponse.status === "fulfilled") {
                    const rows = extractRows(
                        productResponse.value.data,
                        ["products"]
                    );

                    setProducts(
                        rows
                            .map((row) => ({
                                id: optionId(row),
                                product_code: String(
                                    row.product_code ?? ""
                                ),
                                product_name: String(
                                    row.product_name ?? ""
                                ),
                                standard_rate:
                                    row.standard_rate as
                                        | number
                                        | string
                                        | undefined,
                            }))
                            .filter(
                                (row) =>
                                    Number.isSafeInteger(row.id) &&
                                    row.id > 0
                            )
                    );
                }

                const failed = results.some(
                    (result) => result.status === "rejected"
                );

                if (failed) {
                    setError(
                        "Some dropdown data could not be loaded. Check the Clients, Customers, Sites, Locations, and Products APIs."
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        getErrorMessage(
                            err,
                            "Unable to load Rate Matrix dropdowns."
                        )
                    );
                }
            } finally {
                if (!cancelled) {
                    setOptionsLoading(false);
                }
            }
        }

        void loadOptions();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredCustomers = useMemo(() => {
        if (!form.client_id) return [];

        return customers.filter(
            (customer) =>
                customer.client_id == null ||
                Number(customer.client_id) === form.client_id
        );
    }, [customers, form.client_id]);

    const filteredSites = useMemo(() => {
        if (!form.customer_id) return [];

        return sites.filter(
            (site) =>
                site.customer_id == null ||
                Number(site.customer_id) === form.customer_id
        );
    }, [sites, form.customer_id]);

    const selectedSite = useMemo(
        () =>
            sites.find(
                (site) => site.id === form.site_id
            ),
        [sites, form.site_id]
    );

    const selectedProduct = useMemo(
        () =>
            products.find(
                (product) => product.id === form.product_id
            ),
        [products, form.product_id]
    );

    function setField<K extends keyof RateMatrixInput>(
        key: K,
        value: RateMatrixInput[K]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function closeForm() {
        setMode(null);
        setSelectedId(null);
        setForm({ ...emptyForm });
        setError("");
        setNotice("");
    }

    function openCreateForm() {
        setSelectedId(null);
        setForm({ ...emptyForm });
        setError("");
        setNotice("");
        setMode("create");
    }

    async function openEditForm(item: RateMatrix) {
        setError("");
        setNotice("");

        try {
            const full = await getRateMatrix(Number(item.id));

            setSelectedId(Number(full.id));

            setForm({
                client_id: Number(full.client_id),
                customer_id: Number(full.customer_id),
                site_id: Number(full.site_id),
                location_id: Number(full.location_id),
                product_id: Number(full.product_id),
                rate: Number(full.rate),
            });

            setMode("edit");
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to load Rate Matrix details."
                )
            );
        }
    }

    function handleProductChange(value: string) {
        const productId = Number(value) || 0;

        setField("product_id", productId);

        const product = products.find(
            (item) => item.id === productId
        );

        if (product) {
            setField(
                "rate",
                Number(product.standard_rate ?? 0)
            );
        }
    }

    function handleSiteChange(value: string) {
        const siteId = Number(value) || 0;
        const site = sites.find((item) => item.id === siteId);

        setField("site_id", siteId);

        if (
            site?.location_id != null &&
            locations.some(
                (location) =>
                    location.id === Number(site.location_id)
            )
        ) {
            setField(
                "location_id",
                Number(site.location_id)
            );
        }
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!mode) return;

        setError("");
        setNotice("");

        if (!form.client_id) {
            setError("Please select a Client.");
            return;
        }

        if (!form.customer_id) {
            setError("Please select a Customer.");
            return;
        }

        if (!form.site_id) {
            setError("Please select a Customer Site Name.");
            return;
        }

        if (!form.location_id) {
            setError("Please select a Location.");
            return;
        }

        if (!form.product_id) {
            setError("Please select a Product.");
            return;
        }

        const rate = Number(form.rate);

        if (!Number.isFinite(rate) || rate < 0) {
            setError(
                "Product rate must be a valid non-negative amount."
            );
            return;
        }

        const payload: RateMatrixInput = {
            client_id: Number(form.client_id),
            customer_id: Number(form.customer_id),
            site_id: Number(form.site_id),
            location_id: Number(form.location_id),
            product_id: Number(form.product_id),
            rate: Math.round(rate * 100) / 100,
        };

        setSaving(true);

        try {
            if (mode === "create") {
                await createRateMatrix(payload);
            } else if (selectedId !== null) {
                await updateRateMatrix(selectedId, payload);
            } else {
                throw new Error(
                    "No Rate Matrix record selected for updating."
                );
            }

            const message =
                mode === "create"
                    ? "Rate Matrix added successfully."
                    : "Rate Matrix updated successfully.";

            closeForm();
            await loadRateMatrices();
            setNotice(message);
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to save Rate Matrix."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    async function removeRateMatrix(item: RateMatrix) {
        setDeletingId(Number(item.id));
        setError("");

        try {
            await deleteRateMatrix(Number(item.id));
            setRateMatrixToDelete(null);

            if (rateMatrices.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadRateMatrices();
            }

            setNotice("Rate Matrix deleted successfully.");
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to delete Rate Matrix."
                )
            );
        } finally {
            setDeletingId(null);
        }
    }

    const startIndex = (page - 1) * limit;

    const alert = error ? (
        <div
            className="rate-matrix-alert rate-matrix-alert--error"
            role="alert"
        >
            {error}
        </div>
    ) : notice ? (
        <div
            className="rate-matrix-alert rate-matrix-alert--success"
            role="status"
        >
            {notice}
        </div>
    ) : null;

    return (
        <ManagementLayout
            title="Manage Rate Matrix"
            description="Manage product rates for clients, customers, sites, and locations."
            showForm={mode !== null}
            listTitle="Our Rate Matrix List"
            addButtonText="Add Rate Matrix"
            onAdd={openCreateForm}
            onBack={closeForm}
            formTitle={
                mode === "create"
                    ? "Add New Rate Matrix"
                    : "Update Rate Matrix"
            }
            error={alert}
toolbar={
    mode === null ? (
        <>
            {/* Show entries */}
            <div className="management-page__toolbar-group">
                <label htmlFor="rate-matrix-limit">
                    Show
                </label>

                <select
                    id="rate-matrix-limit"
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

            {/* Search */}
            <div className="management-page__toolbar-group">
                <label htmlFor="rate-matrix-search">
                    Search:
                </label>

                <input
                    id="rate-matrix-search"
                    type="search"
                    value={search}
                    placeholder="Search Rate Matrix..."
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
                Showing{" "}
                {total === 0 ? 0 : startIndex + 1} to{" "}
                {Math.min(startIndex + rateMatrices.length, total)}{" "}
                of {total} entries
            </span>

            <div className="management-page__pagination-controls">
                <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => {
                        setPage((current) => current - 1);
                    }}
                >
                    Previous
                </button>

                <span>
                    Page {page} of {totalPages}
                </span>

                <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => {
                        setPage((current) => current + 1);
                    }}
                >
                    Next
                </button>
            </div>
        </>
    ) : null
}
        >
            {mode === null ? (
                <div className="rate-matrix-table-wrapper">
                    <table className="rate-matrix-table">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                <th>Client</th>
                                <th>Customer Name</th>
                                <th>Customer Site Name</th>
                                <th>Location</th>
                                <th>Product</th>
                                <th>Rate</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="rate-matrix-table-message"
                                    >
                                        Loading Rate Matrix...
                                    </td>
                                </tr>
                            ) : rateMatrices.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="rate-matrix-table-message"
                                    >
                                        No Rate Matrix records found.
                                    </td>
                                </tr>
                            ) : (
                                rateMatrices.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{startIndex + index + 1}</td>
                                        <td>{item.client_name || "—"}</td>
                                        <td>{item.customer_name || "—"}</td>
                                        <td>
                                            {item.customer_site_name || "—"}
                                        </td>
                                        <td>{item.location_name || "—"}</td>
                                        <td>
                                            {item.product_name || "—"}
                                        </td>
                                        <td className="rate-matrix-amount">
                                            {formatRate(item.rate)}
                                        </td>
                                        <td>
                                            <div className="rate-matrix-actions">
                                                <ActionButton
                                                    action="edit"
                                                    type="button"
                                                    title="Edit Rate Matrix"
                                                    onClick={() =>
                                                        void openEditForm(item)
                                                    }
                                                />

                                                <ActionButton
                                                    action="delete"
                                                    type="button"
                                                    title="Delete Rate Matrix"
                                                    disabled={
                                                        deletingId !== null
                                                    }
                                                    onClick={() =>
                                                        setRateMatrixToDelete(
                                                            item
                                                        )
                                                    }
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <form
                    className="rate-matrix-form"
                    onSubmit={submit}
                >
                    <fieldset
                        className="rate-matrix-fieldset"
                        disabled={saving || optionsLoading}
                    >
                        <legend>Add New Rate Matrix Form</legend>

                        <p className="rate-matrix-intro">
                            You can add new Rate Matrix from here.
                        </p>

                        <div className="rate-matrix-form-grid">
                            <label className="rate-matrix-form-field">
                                <span>Client Name *</span>
                                <select
                                    required
                                    value={form.client_id || ""}
                                    onChange={(event) => {
                                        const clientId =
                                            Number(event.target.value) || 0;

                                        setForm((current) => ({
                                            ...current,
                                            client_id: clientId,
                                            customer_id: 0,
                                            site_id: 0,
                                            location_id: 0,
                                        }));
                                    }}
                                >
                                    <option value="">
                                        {optionsLoading
                                            ? "Loading clients..."
                                            : "Select Client"}
                                    </option>

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

                            <label className="rate-matrix-form-field">
                                <span>Customer Name *</span>
                                <select
                                    required
                                    value={form.customer_id || ""}
                                    disabled={!form.client_id}
                                    onChange={(event) => {
                                        setForm((current) => ({
                                            ...current,
                                            customer_id:
                                                Number(event.target.value) ||
                                                0,
                                            site_id: 0,
                                            location_id: 0,
                                        }));
                                    }}
                                >
                                    <option value="">
                                        {!form.client_id
                                            ? "Select Client First"
                                            : "Select Customer"}
                                    </option>

                                    {filteredCustomers.map((customer) => (
                                        <option
                                            key={customer.id}
                                            value={customer.id}
                                        >
                                            {getCustomerName(customer)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="rate-matrix-form-field">
                                <span>Customer Site Name *</span>
                                <select
                                    required
                                    value={form.site_id || ""}
                                    disabled={!form.customer_id}
                                    onChange={(event) =>
                                        handleSiteChange(
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        {!form.customer_id
                                            ? "Select Customer First"
                                            : "Select Site"}
                                    </option>

                                    {filteredSites.map((site) => (
                                        <option
                                            key={site.id}
                                            value={site.id}
                                        >
                                            {getSiteName(site)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="rate-matrix-form-field">
                                <span>Location *</span>
                                <select
                                    required
                                    value={form.location_id || ""}
                                    onChange={(event) =>
                                        setField(
                                            "location_id",
                                            Number(event.target.value) || 0
                                        )
                                    }
                                >
                                    <option value="">
                                        Select Location
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

                            <label className="rate-matrix-form-field">
                                <span>Product *</span>
                                <select
                                    required
                                    value={form.product_id || ""}
                                    onChange={(event) =>
                                        handleProductChange(
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
                                            {product.product_code
                                                ? `${product.product_code} — ${getProductName(product)}`
                                                : getProductName(product)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="rate-matrix-form-field">
                                <span>Product Rate ₹ *</span>
                                <input
                                    required
                                    type="number"
                                    min={0}
                                    max={9999999999.99}
                                    step="0.01"
                                    value={form.rate}
                                    onChange={(event) =>
                                        setField(
                                            "rate",
                                            event.target.value === ""
                                                ? 0
                                                : Number(
                                                      event.target.value
                                                  )
                                        )
                                    }
                                />

                                {selectedProduct && (
                                    <small>
                                        Product standard rate: ₹
                                        {formatRate(
                                            selectedProduct.standard_rate ??
                                                0
                                        )}
                                    </small>
                                )}
                            </label>
                        </div>
                    </fieldset>

                    <footer className="rate-matrix-form-footer">
                        <button
                            type="submit"
                            className="rate-matrix-primary-button"
                            disabled={saving || optionsLoading}
                        >
                            {saving
                                ? "Saving..."
                                : mode === "create"
                                  ? "Save Rate Matrix"
                                  : "Update Rate Matrix"}
                        </button>

                        <button
                            type="button"
                            className="rate-matrix-secondary-button"
                            disabled={saving}
                            onClick={closeForm}
                        >
                            Cancel
                        </button>
                    </footer>
                </form>
            )}

            <ConfirmDialog
                open={rateMatrixToDelete !== null}
                title="Delete Rate Matrix?"
                message={
                    rateMatrixToDelete
                        ? `Are you sure you want to delete the rate for ${rateMatrixToDelete.product_name} at ${rateMatrixToDelete.customer_site_name}?`
                        : ""
                }
                itemName={
                    rateMatrixToDelete?.product_name ||
                    "this Rate Matrix record"
                }
                confirmText="Delete"
                loading={deletingId !== null}
                onCancel={() => {
                    if (deletingId === null) {
                        setRateMatrixToDelete(null);
                    }
                }}
                onConfirm={() => {
                    if (rateMatrixToDelete) {
                        void removeRateMatrix(rateMatrixToDelete);
                    }
                }}
            />
        </ManagementLayout>
    );
}