import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type FormEvent,
} from "react";

import apiClient from "../../../api/client";
import "./OrderManagementPage.css";

import createProformaInvoice from "./ProformaInvoice";
import createDeliveryChallan from "./DeliveryChallan";
import { createPortal } from "react-dom";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    createOrder,
    deleteOrder,
    getOrder,
    getOrders,
    saveDispatch,
    sendOrderEmail,
    updateOrder,
    updateOrderStatus,
    type DispatchInput,
    type DispatchStatus,
    type Order,
    type OrderInput,
    type OrderItemInput,
    type OrderStatus,
} from "../api/orders.api";

type ApiRow = Record<string, unknown>;
type Mode = "create" | "edit";

type Option = {
    id: number;
    name: string;
    company_name?: string;
    client_name?: string;
    customer_name?: string;
    location_name?: string;
    location_address?: string;
    location_latitude?: string;
    location_longitude?: string;
    location_map_url?: string;
    product_code?: string;
    standard_rate?: number;
    unit?: string;
    client_id?: number | null;
    customer_id?: number | null;
};

type OrderLine = OrderItemInput;

type OrderForm = Omit<
    OrderInput,
    "items" | "image1" | "image2" | "image3" | "image4"
> & {
    items: OrderLine[];
    image1: File | null;
    image2: File | null;
    image3: File | null;
    image4: File | null;
};

type Driver = {
    id: number;
    name: string;
    vehicle_no: string;
    vehicle_type: string;
    contact: string;
};

type DispatchForm = {
    dispatch_sequence_no: string;
    dispatch_date: string;
    driver_id: string;
    driver_name: string;
    vehicle_no: string;
    vehicle_type: string;
    contact: string;
    dispatch_status: DispatchStatus;
};

type CustomerSite = {
    id: number;
    site_name: string;
    customer_id: number;
    location_id: number | null;
    location_name: string;
    site_location_mode: string;
    site_location_name: string;
    site_location_address: string;
    site_location_latitude: string;
    site_location_longitude: string;
    site_location_map_url: string;
    line_1: string;
    line_2: string;
    city: string;
    state: string;
    pin_code: string;
};

type RateMatrixRow = {
    id: number;
    client_id: number;
    customer_id: number;
    site_id: number;
    location_id: number | null;
    product_id: number;
    rate: number;
};

const PAGE_SIZES = [10, 25, 50, 100];

const ORDER_STATUSES: OrderStatus[] = [
    "Draft",
    "Submitted",
    "Approved",
    "Invoiced",
    "Paid",
    "Overdue",
    "Cancelled",
];

const DISPATCH_STATUSES: DispatchStatus[] = [
    "Pending",
    "Partial",
    "Dispatched",
];

const VEHICLE_TYPES = [
    "Truck",
    "Pickup",
    "Car",
    "Tempo",
    "Van",
    "Other",
];
const COMMENT_OPTIONS = [
    {
        label: "Looking forward for your business.",
        value: "Looking forward for your business.",
    },
    {
        label: "Please send the material at the earliest.",
        value: "Please send the material at the earliest.",
    },
    {
        label: "Kindly confirm the order.",
        value: "Kindly confirm the order.",
    },
    {
        label: "Thank you for your valuable order.",
        value: "Thank you for your valuable order.",
    },
    {
        label: "Please contact us for further details.",
        value: "Please contact us for further details.",
    },
    {
        label: "Custom Comment",
        value: "CUSTOM",
    },
];

const emptyLine: OrderLine = {
    product_id: 0,
    product_name: "",
    unit: "Nos",
    quantity: 1,
    rate_incl_gst: 0,
    discount: 0,
};

function localDate(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function emptyForm(): OrderForm {
    const today = new Date();
    const expected = new Date();

    expected.setDate(expected.getDate() + 7);

    return {
        company_id: 0,
        client_id: 0,
        customer_id: null,
        sales_person_id: null,
        customer_site_name: "",
        site_id: null,
        location_id: null,
        proforma_date: localDate(today),
        expected_shipping_date: localDate(expected),
        reference: "",
        comment: "Looking forward for your business.",
        items: [{ ...emptyLine }],
        image1: null,
        image2: null,
        image3: null,
        image4: null,
    };
}

function emptyDispatch(): DispatchForm {
    return {
        dispatch_sequence_no: "",
        dispatch_date: localDate(new Date()),
        driver_id: "",
        driver_name: "",
        vehicle_no: "",
        vehicle_type: "",
        contact: "",
        dispatch_status: "Dispatched",
    };
}

function obj(value: unknown): ApiRow {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as ApiRow
        : {};
}

function rows(value: unknown, names: string[] = []): ApiRow[] {
    if (Array.isArray(value)) {
        return value as ApiRow[];
    }

    const root = obj(value);
    const payload = root.data ?? root;

    if (Array.isArray(payload)) {
        return payload as ApiRow[];
    }

    const data = obj(payload);

    for (const key of [...names, "rows", "items", "data"]) {
        if (Array.isArray(data[key])) {
            return data[key] as ApiRow[];
        }
    }

    for (const key of [...names, "rows", "items"]) {
        if (Array.isArray(root[key])) {
            return root[key] as ApiRow[];
        }
    }

    return [];
}

function idOf(row: ApiRow): number {
    return Number(
        row.id ??
        row.company_id ??
        row.client_id ??
        row.customer_id ??
        row.location_id ??
        row.product_id ??
        row.driver_id ??
        0
    );
}

function nameOf(row: ApiRow): string {
    return String(
        row.company_name ??
        row.client_name ??
        row.customer_name ??
        row.location_name ??
        row.product_name ??
        row.driver_full_name ??
        row.full_name ??
        row.employee_name ??
        row.name ??
        ""
    );
}

function text(value: unknown): string {
    return value == null ? "" : String(value);
}

function safeMapUrl(
    savedUrl: unknown,
    latitude?: unknown,
    longitude?: unknown
): string | null {
    const url = text(savedUrl).trim();

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
            // Fall back to valid coordinates.
        }
    }

    if (
        latitude == null ||
        longitude == null ||
        !text(latitude).trim() ||
        !text(longitude).trim()
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

function dateValue(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : "";
}

function amount(value: number | string | null | undefined): string {
    const parsed = Number(value ?? 0);

    return (Number.isFinite(parsed) ? parsed : 0).toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    );
}

function errorMessage(error: unknown, fallback: string): string {
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

function orderImageUrl(value: string | null | undefined): string {
    if (!value) {
        return "";
    }

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    const base = String(
        import.meta.env.VITE_API_BASE_URL || ""
    ).replace(/\/$/, "");

    return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

function displayName(
    current: string | null | undefined,
    options: Option[],
    id: number | null | undefined,
    fallback: string
): string {
    const currentName = String(current ?? "").trim();

    if (currentName) {
        return currentName;
    }

    const option = options.find(
        (item) => item.id === Number(id)
    );

    return String(option?.name ?? "").trim() || fallback;
}

function generateDcsNo(orderId: number, date: string): string {
    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
        return String(orderId);
    }

    return `${orderId}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getFullYear()).slice(-2)}`;
}

const menuItemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    textAlign: "left",
    border: 0,
    borderRadius: 5,
    padding: "9px 10px",
    background: "transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: 13,
    color: "#0f172a",
};

export default function OrderManagementPage() {

    const [customComment, setCustomComment] = useState("");
const [commentType, setCommentType] = useState("Looking forward for your business.");

    const [customerSites, setCustomerSites] = useState<CustomerSite[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    const [existingImages, setExistingImages] = useState<
        Record<string, string | null>
    >({
        image1: null,
        image2: null,
        image3: null,
        image4: null,
    });

    const [openActionId, setOpenActionId] = useState<number | null>(null);
    const [actionMenuPosition, setActionMenuPosition] = useState({
        top: 0,
        left: 0,
    });
    const [companies, setCompanies] = useState<Option[]>([]);
    const [clients, setClients] = useState<Option[]>([]);
    const [customers, setCustomers] = useState<Option[]>([]);
    const [locations, setLocations] = useState<Option[]>([]);
    const [products, setProducts] = useState<Option[]>([]);
    const [rateMatrices, setRateMatrices] = useState<RateMatrixRow[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);

    const [loading, setLoading] = useState(true);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [statusFilter, setStatusFilter] = useState("All");
    const [dispatchFilter, setDispatchFilter] = useState("All");

    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [emailSending, setEmailSending] = useState(false);
    const [emailMessage, setEmailMessage] = useState("");
    const [emailMessageType, setEmailMessageType] = useState<
        "success" | "error" | ""
    >("");

    const [mode, setMode] = useState<Mode | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [form, setForm] = useState<OrderForm>(emptyForm);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

    const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
    const [dispatchForm, setDispatchForm] =
        useState<DispatchForm>(emptyDispatch);
    const [dispatchSaving, setDispatchSaving] = useState(false);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getOrders({
                page,
                limit,
                search: search.trim(),
                status: statusFilter,
                dispatch: dispatchFilter,
            });

            setOrders(result.data);
            setTotal(result.pagination.total);
            setTotalPages(result.pagination.totalPages);
        } catch (err) {
            setError(errorMessage(err, "Unable to load orders."));
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, statusFilter, dispatchFilter]);

    type EmployeeOption = {
        id: number;
        employee_name: string;
        employee_code: string;
        status: string;
    };

    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);

    useEffect(() => {
        const fetchEmployees = async () => {
            setEmployeesLoading(true);

            try {
                const response = await apiClient.get("/api/employees", {
                    params: {
                        page: 1,
                        limit: 500,
                    },
                });

                const employeeRows =
                    response.data?.data?.employees ?? [];

                const employeeOptions: EmployeeOption[] =
                    employeeRows.map((employee: any) => ({
                        id: Number(employee.id),
                        employee_name: String(
                            employee.employee_name ?? ""
                        ).trim(),
                        employee_code: String(
                            employee.employee_code ?? ""
                        ),
                        status: String(employee.status ?? ""),
                    }));

                setEmployees(
                    employeeOptions.filter(
                        (employee) =>
                            employee.id > 0 &&
                            employee.employee_name &&
                            employee.status.toLowerCase() === "active"
                    )
                );
            } catch (error) {
                console.error("Failed to load employees:", error);
                setEmployees([]);
            } finally {
                setEmployeesLoading(false);
            }
        };

        void fetchEmployees();
    }, []);

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        let cancelled = false;

        async function loadCustomerSites() {
            setCustomerSites([]);

            if (!form.customer_id) {
                return;
            }

            try {
                const response = await apiClient.get("api/sites", {
                    params: {
                        customer_id: form.customer_id,
                        page: 1,
                        limit: 500,
                    },
                });

                if (cancelled) {
                    return;
                }

                const siteRows = rows(response.data, ["sites"])
                    .map((row): CustomerSite => ({
                        id: idOf(row),
                        site_name: text(
                            row.site_name ??
                            row.customer_site_name ??
                            row.name
                        ),
                        customer_id: Number(
                            row.customer_id ?? form.customer_id
                        ),
                        location_id: row.location_id == null
                            ? null
                            : Number(row.location_id),
                        location_name: text(row.location_name),
                        site_location_mode: text(
                            row.site_location_mode ?? row.location_mode
                        ),
                        site_location_name: text(row.site_location_name),
                        site_location_address: text(
                            row.site_location_address
                        ),
                        site_location_latitude: text(
                            row.site_location_latitude ?? row.latitude
                        ),
                        site_location_longitude: text(
                            row.site_location_longitude ?? row.longitude
                        ),
                        site_location_map_url: text(
                            row.site_location_map_url ??
                            row.location_map_url ??
                            row.map_url
                        ),
                        line_1: text(row.line_1),
                        line_2: text(row.line_2),
                        city: text(row.city),
                        state: text(row.state),
                        pin_code: text(row.pin_code),
                    }))
                    .filter((site) => site.id > 0 && site.site_name);

                setCustomerSites(siteRows);
            } catch (siteError) {
                if (!cancelled) {
                    setCustomerSites([]);
                    setError(
                        errorMessage(
                            siteError,
                            "Unable to load sites for the selected customer."
                        )
                    );
                }
            }
        }

        void loadCustomerSites();

        return () => {
            cancelled = true;
        };
    }, [form.customer_id]);

    useEffect(() => {
        let cancelled = false;

        async function loadOptions() {
            setOptionsLoading(true);

            const requests = [
                apiClient.get("api/companies", {
                    params: { page: 1, limit: 500 },
                }),
                apiClient.get("api/clients", {
                    params: { page: 1, limit: 500 },
                }),
                apiClient.get("api/customers", {
                    params: { page: 1, limit: 500 },
                }),
                apiClient.get("api/locations", {
                    params: { page: 1, limit: 500 },
                }),
                apiClient.get("api/products", {
                    params: { page: 1, limit: 500 },
                }),
                apiClient.get("api/drivers", {
                    params: { page: 1, limit: 500 },
                }),
                apiClient.get("api/rate-matrix", {
                    params: { page: 1, limit: 1000 },
                }),
            ];

            const results = await Promise.allSettled(requests);

            if (cancelled) {
                return;
            }

            const getRows = (
                index: number,
                names: string[]
            ): ApiRow[] => {
                const result = results[index];

                return result.status === "fulfilled"
                    ? rows(result.value.data, names)
                    : [];
            };

            const mapOptions = (data: ApiRow[]): Option[] =>
                data
                    .map((row) => ({
                        ...row,
                        id: idOf(row),
                        name: nameOf(row),
                        company_name: text(row.company_name),
                        client_name: text(row.client_name),
                        customer_name: text(row.customer_name),
                        location_name: text(row.location_name),
                        product_code: text(row.product_code),
                        standard_rate: Number(
                            row.standard_rate ?? row.rate ?? 0
                        ),
                        unit: text(row.unit ?? row.product_unit) || "Nos",
                        client_id: row.client_id == null
                            ? null
                            : Number(row.client_id),
                        customer_id: row.customer_id == null
                            ? null
                            : Number(row.customer_id),
                    }))
                    .filter((item) => item.id > 0) as Option[];

            setCompanies(mapOptions(getRows(0, ["companies"])));
            setClients(mapOptions(getRows(1, ["clients"])));
            setCustomers(mapOptions(getRows(2, ["customers"])));
            setLocations(mapOptions(getRows(3, ["locations"])));
            setProducts(mapOptions(getRows(4, ["products"])));

            const matrixResult = results[6];

            const matrixRows = matrixResult.status === "fulfilled"
                ? rows(
                    matrixResult.value.data,
                    ["rateMatrices", "rate_matrices", "rates"]
                )
                : [];

            setRateMatrices(
                matrixRows
                    .map((row): RateMatrixRow => ({
                        id: idOf(row),
                        client_id: Number(row.client_id ?? 0),
                        customer_id: Number(row.customer_id ?? 0),
                        site_id: Number(
                            row.site_id ?? row.customer_site_id ?? 0
                        ),
                        location_id: row.location_id == null
                            ? null
                            : Number(row.location_id),
                        product_id: Number(row.product_id ?? 0),
                        rate: Number(
                            row.rate ??
                            row.product_rate ??
                            row.rate_incl_gst ??
                            0
                        ),
                    }))
                    .filter(
                        (row) =>
                            row.client_id > 0 &&
                            row.customer_id > 0 &&
                            row.site_id > 0 &&
                            row.product_id > 0
                    )
            );

            const driverRows = getRows(5, ["drivers"]);

            setDrivers(
                driverRows
                    .map((row): Driver => ({
                        id: idOf(row),
                        name: nameOf(row),
                        vehicle_no: text(
                            row.vehicle_number ?? row.vehicle_no
                        ),
                        vehicle_type: text(row.vehicle_type),
                        contact: text(
                            row.contact_no ?? row.phone ?? row.contact
                        ),
                    }))
                    .filter((driver) => driver.id > 0)
            );

            if (results.some((result) => result.status === "rejected")) {
                setError(
                    "One or more dropdown APIs failed. Check your API routes, including api/rate-matrix."
                );
            }

            setOptionsLoading(false);
        }

        void loadOptions().catch((err) => {
            if (!cancelled) {
                setError(
                    errorMessage(err, "Unable to load dropdown options.")
                );
                setOptionsLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const visibleCustomers = useMemo(() => {
        if (!form.client_id) {
            return [];
        }

        return customers.filter(
            (customer) =>
                Number(customer.client_id) === Number(form.client_id)
        );
    }, [customers, form.client_id]);

    const selectedCustomerSite = useMemo(() => {
        const siteName = form.customer_site_name.trim().toLowerCase();

        if (!siteName) {
            return undefined;
        }

        return customerSites.find(
            (site) => site.site_name.trim().toLowerCase() === siteName
        );
    }, [customerSites, form.customer_site_name]);

    const selectedSiteLocation = useMemo(() => {
        if (!selectedCustomerSite) {
            return null;
        }

        return locations.find(
            (location) =>
                location.id === Number(selectedCustomerSite.location_id)
        ) ?? null;
    }, [locations, selectedCustomerSite]);

    const selectedSiteLocationName = useMemo(() => {
        if (!selectedCustomerSite) {
            return "Automatically populated from the selected site";
        }

        const site = selectedCustomerSite;

        const address = [
            site.line_1,
            site.line_2,
            site.city,
            site.state,
            site.pin_code,
        ]
            .map((part) => part.trim())
            .filter(Boolean)
            .join(", ");

        return (
            site.location_name.trim() ||
            selectedSiteLocation?.location_name?.trim() ||
            selectedSiteLocation?.name?.trim() ||
            site.site_location_name.trim() ||
            site.site_location_address.trim() ||
            address ||
            (
                site.site_location_latitude &&
                    site.site_location_longitude
                    ? `${site.site_location_latitude}, ${site.site_location_longitude}`
                    : "Location not provided"
            )
        );
    }, [selectedCustomerSite, selectedSiteLocation]);

    const selectedSiteMapUrl = useMemo(() => {
        if (!selectedCustomerSite) {
            return null;
        }

        return safeMapUrl(
            selectedCustomerSite.site_location_map_url ||
            selectedSiteLocation?.location_map_url,
            selectedCustomerSite.site_location_latitude ||
            selectedSiteLocation?.location_latitude,
            selectedCustomerSite.site_location_longitude ||
            selectedSiteLocation?.location_longitude
        );
    }, [selectedCustomerSite, selectedSiteLocation]);

    function getMatrixRate(productId: number): number | null {
        if (
            !form.client_id ||
            !form.customer_id ||
            !selectedCustomerSite ||
            !productId
        ) {
            return null;
        }

        const matrix = rateMatrices.find(
            (row) =>
                row.client_id === Number(form.client_id) &&
                row.customer_id === Number(form.customer_id) &&
                row.site_id === Number(selectedCustomerSite.id) &&
                row.product_id === Number(productId)
        );

        return matrix ? matrix.rate : null;
    }

    useEffect(() => {
        if (!form.customer_id || !selectedCustomerSite) {
            return;
        }

        

        setForm((previous) => {
            let changed = false;

            const items = previous.items.map((item) => {
                if (!item.product_id) {
                    return item;
                }

                const matrix = rateMatrices.find(
                    (row) =>
                        row.client_id === Number(previous.client_id) &&
                        row.customer_id === Number(previous.customer_id) &&
                        row.site_id === Number(selectedCustomerSite.id) &&
                        row.product_id === Number(item.product_id)
                );

                const nextRate = matrix?.rate ?? 0;

                if (Number(item.rate_incl_gst) === nextRate) {
                    return item;
                }

                changed = true;

                return {
                    ...item,
                    rate_incl_gst: nextRate,
                };
            });

            return changed ? { ...previous, items } : previous;
        });
    }, [
        form.client_id,
        form.customer_id,
        form.customer_site_name,
        selectedCustomerSite,
        rateMatrices,
    ]);

    const subtotal = useMemo(
        () =>
            Math.round(
                form.items.reduce(
                    (sum, item) =>
                        sum + item.quantity * item.rate_incl_gst,
                    0
                ) * 100
            ) / 100,
        [form.items]
    );

    const totalDiscount = useMemo(
        () =>
            Math.round(
                form.items.reduce(
                    (sum, item) => sum + item.discount,
                    0
                ) * 100
            ) / 100,
        [form.items]
    );

    const grandTotal = Math.round(
        (subtotal - totalDiscount) * 100
    ) / 100;

    function setField<K extends keyof OrderForm>(
        field: K,
        value: OrderForm[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

function resetForm() {
    setForm(emptyForm());

    setCommentType("Looking forward for your business.");
    setCustomComment("");

    setExistingImages({
        image1: null,
        image2: null,
        image3: null,
        image4: null,
    });

    setSelectedId(null);
    setMode(null);
    setError("");
}
function addOrder() {
    setError("");
    setNotice("");
    setSelectedId(null);

    setForm(emptyForm());

    setCommentType("Looking forward for your business.");
    setCustomComment("");

    setExistingImages({
        image1: null,
        image2: null,
        image3: null,
        image4: null,
    });

    setMode("create");
}

async function editOrder(order: Order) {
    setError("");
    setNotice("");

    try {
        const result = await getOrder(order.id);

        // Restore saved comment
        const savedComment =
            result.comment?.trim() ||
            "Looking forward for your business.";

        const predefinedComment = COMMENT_OPTIONS.find(
            (option) =>
                option.value !== "CUSTOM" &&
                option.value === savedComment
        );

        setCommentType(
            predefinedComment
                ? predefinedComment.value
                : "CUSTOM"
        );

        setCustomComment(
            predefinedComment ? "" : savedComment
        );

        setForm({
            company_id: result.company_id,
            sales_person_id:
                result.sales_person_id ??
                employees.find(
                    (employee) =>
                        employee.employee_name.trim().toLowerCase() ===
                        (result.reference ?? "").trim().toLowerCase()
                )?.id ??
                null,

            client_id: result.client_id,
            customer_id: result.customer_id,
            customer_site_name: result.customer_site_name,
            site_id:
                result.site_id ??
                customerSites.find(
                    (site) =>
                        site.site_name === result.customer_site_name &&
                        Number(site.customer_id) === Number(result.customer_id)
                )?.id ??
                null,

            location_id: result.location_id,
            proforma_date: dateValue(result.proforma_date),
            expected_shipping_date: dateValue(result.expected_shipping_date),

            reference: result.reference ?? "",
            comment: savedComment,

            items: result.items?.length
                ? result.items.map((item) => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    unit: item.unit,
                    quantity: item.quantity,
                    rate_incl_gst: item.rate_incl_gst,
                    discount: item.discount,
                }))
                : [{ ...emptyLine }],

            image1: null,
            image2: null,
            image3: null,
            image4: null,
        });

        setExistingImages({
            image1: result.image1 ?? null,
            image2: result.image2 ?? null,
            image3: result.image3 ?? null,
            image4: result.image4 ?? null,
        });

        setSelectedId(result.id);
        setMode("edit");
    } catch (err) {
        setError(
            errorMessage(err, "Unable to load order details.")
        );
    }
}

    function updateLine(
        index: number,
        field: keyof OrderLine,
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            items: previous.items.map((item, itemIndex) => {
                if (itemIndex !== index) {
                    return item;
                }

                if (field === "product_id") {
                    const product = products.find(
                        (entry) => entry.id === Number(value)
                    );

                    const matrix =
                        form.client_id &&
                            form.customer_id &&
                            selectedCustomerSite
                            ? rateMatrices.find(
                                (row) =>
                                    row.client_id ===
                                    Number(form.client_id) &&
                                    row.customer_id ===
                                    Number(form.customer_id) &&
                                    row.site_id ===
                                    Number(selectedCustomerSite.id) &&
                                    row.product_id === Number(value)
                            )
                            : undefined;

                    return {
                        ...item,
                        product_id: product?.id ?? 0,
                        product_name: product?.name ?? "",
                        unit: product?.unit ?? "Nos",
                        rate_incl_gst: matrix ? matrix.rate : 0,
                    };
                }

                if (field === "unit" || field === "product_name") {
                    return {
                        ...item,
                        [field]: value,
                    };
                }

                return {
                    ...item,
                    [field]: value === "" ? 0 : Number(value),
                };
            }),
        }));
    }

    useEffect(() => {
        if (
            !form.client_id ||
            !form.customer_id ||
            !selectedCustomerSite
        ) {
            return;
        }

        const missingRate = form.items.some(
            (item) =>
                item.product_id > 0 &&
                getMatrixRate(item.product_id) === null
        );

        if (missingRate) {
            setError(
                "No Rate Matrix rate is allocated for one or more selected products for this Client, Customer, and Customer Site."
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        form.client_id,
        form.customer_id,
        form.customer_site_name,
        form.items,
        rateMatrices,
        customerSites,
    ]);

    function addItem() {
        setForm((previous) => ({
            ...previous,
            items: [...previous.items, { ...emptyLine }],
        }));
    }

    function removeItem(index: number) {
        setForm((previous) => ({
            ...previous,
            items: previous.items.length > 1
                ? previous.items.filter(
                    (_, itemIndex) => itemIndex !== index
                )
                : previous.items,
        }));
    }

    async function submitOrder(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setNotice("");

        if (!form.company_id || !form.client_id) {
            setError("Please select Company and Client.");
            return;
        }

        if (!form.customer_id) {
            setError(
                "Please select a Customer associated with the selected Client."
            );
            return;
        }

        if (!selectedCustomerSite) {
            setError(
                "Please select a Customer Site belonging to the selected Customer."
            );
            return;
        }

        if (
            !form.proforma_date ||
            !form.expected_shipping_date ||
            form.expected_shipping_date < form.proforma_date
        ) {
            setError("Please enter valid order and shipping dates.");
            return;
        }

        if (!form.customer_site_name.trim()) {
            setError("Customer Site Name is required.");
            return;
        }

        if (!form.comment.trim()) {
            setError("Comment is required.");
            return;
        }

        const mismatchedRate = form.items.find((item) => {
            if (!item.product_id) {
                return false;
            }

            const expected = getMatrixRate(item.product_id);

            return (
                expected !== null &&
                Math.abs(
                    Number(item.rate_incl_gst) - expected
                ) > 0.009
            );
        });

        if (mismatchedRate) {
            const expected = getMatrixRate(
                mismatchedRate.product_id
            );

            setError(
                `Product ${mismatchedRate.product_name || mismatchedRate.product_id} rate does not match the selected Rate Matrix. Expected ₹${amount(expected)}.`
            );

            return;
        }

        if (
            form.items.some(
                (item) =>
                    !item.product_id ||
                    getMatrixRate(item.product_id) === null ||
                    !item.unit.trim() ||
                    !Number.isFinite(item.quantity) ||
                    item.quantity <= 0 ||
                    !Number.isFinite(item.rate_incl_gst) ||
                    item.rate_incl_gst < 0 ||
                    !Number.isFinite(item.discount) ||
                    item.discount < 0 ||
                    item.discount >
                    item.quantity * item.rate_incl_gst
            )
        ) {
            setError(
                "Please complete every item, check quantity/rate/discount, and ensure each product has a Rate Matrix allocation for the selected Client, Customer, and Site."
            );

            return;
        }

        if (mode === "edit" && selectedId == null) {
            setError("Select an order to update.");
            return;
        }

        setSaving(true);
        const selectedEmployee = employees.find(
            (employee) =>
                employee.id === Number(form.sales_person_id)
        );

        try {
            const payload: OrderInput = {
                company_id: form.company_id,
                client_id: form.client_id,
                customer_id: form.customer_id,
                customer_site_name: form.customer_site_name.trim(),
                site_id: selectedCustomerSite.id,

                // Employee name is saved in Reference
                reference: selectedEmployee?.employee_name ?? "",

                // Employee ID is saved separately
                sales_person_id: form.sales_person_id,

                location_id:
                    selectedCustomerSite.location_id ??
                    form.location_id,

                proforma_date: form.proforma_date,
                expected_shipping_date: form.expected_shipping_date,

                comment: form.comment.trim(),
                items: form.items,
                image1: form.image1,
                image2: form.image2,
                image3: form.image3,
                image4: form.image4,
            };

            if (mode === "create") {
                await createOrder(payload);
            } else {
                await updateOrder(selectedId!, payload);
            }

            const savedMode = mode;

            resetForm();
            await loadOrders();

            setNotice(
                savedMode === "create"
                    ? "Order created successfully."
                    : "Order updated successfully."
            );
        } catch (err) {
            setError(errorMessage(err, "Unable to save order."));
        } finally {
            setSaving(false);
        }
    }

    async function changeStatus(
        order: Order,
        status: OrderStatus
    ) {
        if (status === order.status) {
            return;
        }

        setBusyId(order.id);
        setError("");
        setNotice("");

        try {
            await updateOrderStatus(order.id, status);
            await loadOrders();

            setNotice(`${order.pino} status updated to ${status}.`);
        } catch (err) {
            setError(
                errorMessage(err, "Unable to update invoice status.")
            );
        } finally {
            setBusyId(null);
        }
    }

    function openDispatch(order: Order) {
        setError("");
        setDispatchOrder(order);

        const dispatchDate =
            dateValue(order.dispatch_date) || localDate(new Date());

        setDispatchForm({
            ...emptyDispatch(),
            dispatch_sequence_no:
                order.dcsno ||
                order.dispatch_sequence_no ||
                generateDcsNo(order.id, dispatchDate),
            dispatch_date: dispatchDate,
            driver_id: order.driver_id
                ? String(order.driver_id)
                : "",
            driver_name: order.driver_name ?? "",
            vehicle_no: order.vehicle_no ?? "",
            vehicle_type: order.vehicle_type ?? "",
            contact: order.contact ?? "",
            dispatch_status: order.dispatch_status ?? "Pending",
        });
    }

    function selectDriver(driverId: string) {
        const driver = drivers.find(
            (entry) => entry.id === Number(driverId)
        );

        setDispatchForm((previous) => ({
            ...previous,
            driver_id: driverId,
            driver_name: driver?.name ?? "",
            vehicle_no: driver?.vehicle_no ?? "",
            vehicle_type: driver?.vehicle_type ?? "",
            contact: driver?.contact ?? "",
        }));
    }

    async function submitDispatch(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!dispatchOrder) {
            return;
        }

        if (!dispatchForm.dispatch_sequence_no.trim()) {
            setError("Dispatch Sequence No is required.");
            return;
        }

        if (
            !dispatchForm.dispatch_date ||
            !dispatchForm.driver_id
        ) {
            setError("Date Of Dispatch and Driver Name are required.");
            return;
        }

        if (
            !dispatchForm.vehicle_no.trim() ||
            !dispatchForm.vehicle_type ||
            !dispatchForm.contact.trim()
        ) {
            setError(
                "Vehicle No, Type Of Vehicle and Contact are required."
            );
            return;
        }

        const orderBeingDispatched = dispatchOrder;

        setDispatchSaving(true);
        setError("");
        setNotice("");

        try {
            const payload: DispatchInput = {
                dispatch_sequence_no:
                    dispatchForm.dispatch_sequence_no.trim(),
                dispatch_date: dispatchForm.dispatch_date,
                driver_id: Number(dispatchForm.driver_id),
                driver_name: dispatchForm.driver_name,
                vehicle_no: dispatchForm.vehicle_no.trim(),
                vehicle_type: dispatchForm.vehicle_type,
                contact: dispatchForm.contact.trim(),
                dispatch_status: dispatchForm.dispatch_status,
            };

            await saveDispatch(orderBeingDispatched.id, payload);

            setDispatchOrder(null);
            await loadOrders();

            setNotice(
                `${orderBeingDispatched.pino} dispatch details submitted.`
            );
        } catch (err) {
            setError(
                errorMessage(
                    err,
                    "Unable to save dispatch details. Check the dispatch API."
                )
            );
        } finally {
            setDispatchSaving(false);
        }
    }

    async function removeOrder() {
        if (!orderToDelete) {
            return;
        }

        const deleting = orderToDelete;

        setBusyId(deleting.id);
        setError("");

        try {
            await deleteOrder(deleting.id);
            setOrderToDelete(null);

            if (orders.length === 1 && page > 1) {
                setPage((previous) => previous - 1);
            } else {
                await loadOrders();
            }

            setNotice(`${deleting.pino} deleted successfully.`);
        } catch (err) {
            setError(
                errorMessage(err, "Unable to delete order.")
            );
        } finally {
            setBusyId(null);
        }
    }

    /*
     * DOCUMENT GENERATION
     *
     * Proforma Invoice HTML/CSS is implemented in ProformaInvoice.tsx.
     * Delivery Challan HTML/CSS is implemented in DeliveryChallan.tsx.
     * This page only calls the relevant generator.
     */

    function getDocumentHtml(
        order: Order,
        type: "PI" | "DC"
    ): string {
        return type === "PI"
            ? createProformaInvoice(order)
            : createDeliveryChallan(order);
    }

    async function previewDocument(
        order: Order,
        type: "PI" | "DC"
    ) {
        setError("");

        const previewWindow = window.open(
            "",
            "_blank",
            "width=1100,height=850"
        );

        if (!previewWindow) {
            setError(
                "Please allow pop-ups to preview this document."
            );
            return;
        }

        try {
            const detailedOrder = await getOrder(order.id);
            const html = getDocumentHtml(detailedOrder, type);

            previewWindow.document.open();
            previewWindow.document.write(html);
            previewWindow.document.close();
            previewWindow.focus();
        } catch (err) {
            previewWindow.close();

            setError(
                errorMessage(err, "Unable to preview the document.")
            );
        }
    }

    function validateDispatchDetails(
        order: Order,
        action: "print" | "email"
    ): boolean {
        if (!order.dcsno && !order.dispatch_sequence_no) {
            const message =
                action === "print"
                    ? "Please add and save Dispatch Details before printing the Delivery Challan."
                    : "Please add and save Dispatch Details before sending the Delivery Challan Email.";

            setEmailMessage(message);
            setEmailMessageType("error");
            setError("");

            return false;
        }

        return true;
    }

    async function printDocument(
        order: Order,
        type: "PI" | "DC"
    ) {
        setError("");
        setEmailMessage("");
        setEmailMessageType("");

        if (type === "DC" && !validateDispatchDetails(order, "print")) {
            return;
        }

        const printWindow = window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );

        if (!printWindow) {
            setError(
                "Please allow pop-ups to print this document."
            );
            return;
        }

        try {
            const detailedOrder = await getOrder(order.id);

            if (
                type === "DC" &&
                !validateDispatchDetails(detailedOrder, "print")
            ) {
                printWindow.close();
                return;
            }

            const html = getDocumentHtml(detailedOrder, type);

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();

            printWindow.onload = () => {
                printWindow.focus();
                printWindow.print();
            };
        } catch (err) {
            printWindow.close();

            setError(
                errorMessage(err, "Unable to prepare the document.")
            );
        }
    }

    async function emailDocument(
        order: Order,
        type: "PI" | "DC"
    ) {
        setError("");
        setNotice("");
        setEmailMessage("");
        setEmailMessageType("");

        if (type === "DC" && !validateDispatchDetails(order, "email")) {
            return;
        }

        setEmailSending(true);

        try {
            const detailedOrder = await getOrder(order.id);

            if (
                type === "DC" &&
                !validateDispatchDetails(detailedOrder, "email")
            ) {
                return;
            }

            const html = getDocumentHtml(detailedOrder, type);

            const result = await sendOrderEmail(
                order.id,
                type,
                html
            );

            setEmailMessage(
                result.message ||
                `${type === "PI" ? "Proforma Invoice" : "Delivery Challan"} email sent successfully.`
            );

            setEmailMessageType("success");
        } catch (err) {
            setEmailMessage(
                errorMessage(
                    err,
                    "Unable to send the document email. Verify the SMTP configuration and recipient email address."
                )
            );

            setEmailMessageType("error");
        } finally {
            setEmailSending(false);
        }
    }

    const startEntry =
        total === 0 ? 0 : (page - 1) * limit + 1;

    const endEntry = Math.min(
        (page - 1) * limit + orders.length,
        total
    );

    const toolbar = mode === null ? (
        <div className="order-toolbar">
            <div className="order-toolbar__entries">
                <label htmlFor="order-limit">Show</label>

                <select
                    id="order-limit"
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

            <div className="order-toolbar__right">
                <label>
                    Status

                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="All">All</option>

                        {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Dispatch

                    <select
                        value={dispatchFilter}
                        onChange={(event) => {
                            setDispatchFilter(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="All">All</option>

                        {DISPATCH_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="order-toolbar__search">
                    Search

                    <input
                        type="search"
                        value={search}
                        placeholder="Search orders..."
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>
            </div>
        </div>
    ) : null;

    const pagination = mode === null ? (
        <div className="order-pagination">
            <span>
                Showing {startEntry} to {endEntry} of {total} entries
            </span>

            <div>
                <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() =>
                        setPage((value) => Math.max(1, value - 1))
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
                        setPage((value) =>
                            Math.min(totalPages, value + 1)
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
            title="Manage Order"
            description="Create, invoice, dispatch and manage customer orders."
            showForm={mode !== null}
            listTitle="Our Order List"
            addButtonText="Add Order"
            onAdd={addOrder}
            onBack={resetForm}
            formTitle={mode === "edit" ? "Edit Order" : "Add Order"}
            toolbar={toolbar}
            pagination={pagination}
            error={error}
            notice={notice}
        >
            {error && (
                <div className="alert-error" role="alert">
                    {error}
                </div>
            )}

            {notice && (
                <div className="alert-success" role="status">
                    {notice}
                </div>
            )}
            {emailSending && (
                <div className="alert-info" role="status">
                    <i className="bi bi-hourglass-split" />
                    Sending email... Please wait.
                </div>
            )}
            {/* Email success or error message */}
            {emailMessage && (
                <div
                    className={
                        emailMessageType === "success"
                            ? "alert-success"
                            : "alert-error"
                    }
                    role="alert"
                >
                    <i
                        className={
                            emailMessageType === "success"
                                ? "bi bi-check-circle-fill"
                                : "bi bi-exclamation-triangle-fill"
                        }
                    />

                    <span>{emailMessage}</span>

                    <button
                        type="button"
                        onClick={() => {
                            setEmailMessage("");
                            setEmailMessageType("");
                        }}
                        aria-label="Close notification"
                    >
                        ×
                    </button>
                </div>
            )}

            {mode === null ? (

                <div className="order-table-wrapper">
                    <table className="">
                        <thead>
                            <tr>
                                <th>PINO</th>
                                <th>DCSNO</th>
                                <th>Company</th>
                                <th>Client</th>
                                <th>Customer</th>
                                <th>Location</th>
                                <th>Amt</th>
                                <th>Action</th>
                                <th>Status</th>
                                <th>Dispatch</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="order-empty">
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="order-empty">
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="table-no-wrap">{order.pino || "—"}</td>
                                        <td className="table-no-wrap">{order.dcsno || "—"}</td>

                                        <td>
                                            {displayName(
                                                order.company_name,
                                                companies,
                                                order.company_id,
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            {displayName(
                                                order.client_name,
                                                clients,
                                                order.client_id,
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            {displayName(
                                                order.customer_name,
                                                customers,
                                                order.customer_id,
                                                "—"
                                            )}
                                        </td>

                                        <td>
                                            {displayName(
                                                order.location_name,
                                                locations,
                                                order.location_id,
                                                order.customer_site_name || "—"
                                            )}
                                        </td>

                                        <td className="order-amount table-no-wrap">
                                            ₹ {amount(order.grand_total)}
                                        </td>


                                        <td>
                                            <button
                                                type="button"
                                                className={`order-actions-menu-summary ${openActionId === order.id ? "active" : ""
                                                    }`}
                                                onClick={(event) => {
                                                    const button = event.currentTarget;
                                                    const rect = button.getBoundingClientRect();
                                                    const menuWidth = 240;
                                                    const menuHeight = 300;

                                                    if (openActionId === order.id) {
                                                        setOpenActionId(null);
                                                        return;
                                                    }

                                                    const left = Math.max(
                                                        8,
                                                        Math.min(
                                                            rect.right - menuWidth,
                                                            window.innerWidth - menuWidth - 8
                                                        )
                                                    );

                                                    const openAbove =
                                                        rect.bottom + menuHeight > window.innerHeight - 8;

                                                    setActionMenuPosition({
                                                        top: openAbove
                                                            ? Math.max(8, rect.top - menuHeight - 4)
                                                            : rect.bottom + 4,
                                                        left,
                                                    });

                                                    setOpenActionId(order.id);
                                                }}
                                            >
                                                <i className="bi bi-three-dots-vertical" /> Actions
                                            </button>

                                            {openActionId === order.id &&
                                                createPortal(
                                                    <div
                                                        className="order-actions-menu__items"
                                                        style={{
                                                            top: actionMenuPosition.top,
                                                            left: actionMenuPosition.left,
                                                        }}
                                                        onClick={(event) => event.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            style={menuItemStyle}
                                                            onClick={() => {
                                                                setOpenActionId(null);
                                                                void printDocument(order, "PI");
                                                            }}
                                                        >
                                                            <i className="bi bi-printer-fill" /> Print PI
                                                        </button>

                                                        <button
                                                            type="button"
                                                            style={menuItemStyle}
                                                            onClick={() => {
                                                                setOpenActionId(null);
                                                                void emailDocument(order, "PI");
                                                            }}
                                                        >
                                                            <i className="bi bi-envelope-fill" /> Email PI
                                                        </button>

                                                        <button
                                                            type="button"
                                                            style={menuItemStyle}
                                                            onClick={() => {
                                                                setOpenActionId(null);
                                                                void previewDocument(order, "PI");
                                                            }}
                                                        >
                                                            <i className="bi bi-eye-fill" /> Preview PI
                                                        </button>

                                                        <button
                                                            type="button"
                                                            style={menuItemStyle}

                                                            onClick={() => {
                                                                setOpenActionId(null);
                                                                void emailDocument(order, "DC");
                                                            }}
                                                        >
                                                            <i className="bi bi-envelope-at-fill" /> Delivery Challan Email
                                                        </button>

                                                        <button
                                                            type="button"
                                                            style={menuItemStyle}

                                                            onClick={() => {
                                                                setOpenActionId(null);
                                                                void printDocument(order, "DC");
                                                            }}
                                                        >
                                                            <i className="bi bi-file-earmark-pdf-fill" /> Print DC
                                                        </button>

                                                        <button
                                                            type="button"
                                                            style={menuItemStyle}
                                                            disabled={order.status === "Cancelled"}
                                                            onClick={() => {
                                                                setOpenActionId(null);
                                                                void editOrder(order);
                                                            }}
                                                        >
                                                            <i className="bi bi-pencil-square" /> Edit Order
                                                        </button>

                                                        <button
                                                            type="button"
                                                            style={{
                                                                ...menuItemStyle,
                                                                color: "#b91c1c",
                                                            }}
                                                            disabled={["Submitted", "Approved"].includes(order.status)}
                                                            onClick={() => {
                                                                setOpenActionId(null);
                                                                setOrderToDelete(order);
                                                            }}
                                                        >
                                                            <i className="bi bi-trash-fill" /> Delete Order
                                                        </button>
                                                    </div>,
                                                    document.body
                                                )}
                                        </td>


                                        <td>
                                            <select
                                                className="status-button"
                                                aria-label={`Invoice status for ${order.pino}`}
                                                value={order.status}
                                                disabled={busyId === order.id}
                                                onChange={(event) =>
                                                    void changeStatus(
                                                        order,
                                                        event.target.value as OrderStatus
                                                    )
                                                }
                                            >
                                                {ORDER_STATUSES.map((status) => (
                                                    <option
                                                        key={status}
                                                        value={status}
                                                    >
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="order-icon-button order-dispatch-button"
                                                title="Dispatch details"
                                                aria-label={`Dispatch details for ${order.pino}`}
                                                onClick={() =>
                                                    openDispatch(order)
                                                }
                                            >
                                                <i className="bi bi-truck" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <form
                    className="order-form"
                    onSubmit={submitOrder}
                >
                    <fieldset disabled={saving || optionsLoading}>
                        <legend>Order Details</legend>

                        <p className="order-form__description">
                            Enter the order information, upload images, and add items.
                        </p>

                        {optionsLoading && (
                            <p className="order-loading">
                                Loading dropdown options...
                            </p>
                        )}

                        <div className="order-form__grid">
                            <label>
                                <span>Company *</span>

                                <select
                                    required
                                    value={form.company_id || ""}
                                    onChange={(event) =>
                                        setField(
                                            "company_id",
                                            Number(event.target.value) || 0
                                        )
                                    }
                                >
                                    <option value="">Select Company</option>

                                    {companies.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Client *</span>

                                <select
                                    required
                                    value={form.client_id || ""}
                                    onChange={(event) => {
                                        const id =
                                            Number(event.target.value) || 0;

                                        setForm((previous) => ({
                                            ...previous,
                                            client_id: id,
                                            customer_id: null,
                                            customer_site_name: "",
                                            site_id: null,
                                            location_id: null,
                                        }));
                                    }}
                                >
                                    <option value="">Select Client</option>

                                    {clients.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Customer *</span>

                                <select
                                    required
                                    value={form.customer_id ?? ""}
                                    disabled={!form.client_id}
                                    onChange={(event) =>
                                        setForm((previous) => ({
                                            ...previous,
                                            customer_id: event.target.value
                                                ? Number(event.target.value)
                                                : null,
                                            customer_site_name: "",
                                            site_id: null,
                                            location_id: null,
                                        }))
                                    }
                                >
                                    <option value="">Select Customer</option>

                                    {visibleCustomers.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Customer Site Name *</span>

                                <select
                                    id="customer_site_name"
                                    name="customer_site_name"
                                    required
                                    value={form.customer_site_name}
                                    disabled={!form.customer_id}
                                    onChange={(event) => {
                                        const siteName = event.target.value;

                                        const site = customerSites.find(
                                            (entry) =>
                                                entry.site_name === siteName
                                        );

                                        setForm((previous) => ({
                                            ...previous,
                                            customer_site_name: siteName,
                                            site_id: site?.id ?? null,
                                            location_id:
                                                site?.location_id ?? null,
                                        }));

                                        setError("");
                                    }}
                                >
                                    <option value="">
                                        {form.customer_id
                                            ? "Select Customer Site"
                                            : "Select Customer First"}
                                    </option>

                                    {customerSites
                                        .filter(
                                            (site) =>
                                                Number(site.customer_id) ===
                                                Number(form.customer_id)
                                        )
                                        .map((site) => (
                                            <option
                                                key={site.id}
                                                value={site.site_name}
                                            >
                                                {site.site_name}
                                            </option>
                                        ))}
                                </select>
                            </label>

                            <div className="order-location-display">
                                <span>Location</span>

                                <div className="order-location-display__value">
                                    {selectedSiteLocationName}
                                </div>

                                {selectedCustomerSite &&
                                    selectedSiteMapUrl && (
                                        <a
                                            href={selectedSiteMapUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <i
                                                className="bi bi-geo-alt-fill"
                                                aria-hidden="true"
                                            />{" "}
                                            View Map
                                        </a>
                                    )}

                                {selectedCustomerSite?.site_location_mode && (
                                    <small>
                                        Location type:{" "}
                                        {selectedCustomerSite.site_location_mode}
                                    </small>
                                )}
                            </div>

                            <label>
                                <span>Proforma Date *</span>

                                <input
                                    type="date"
                                    required
                                    value={form.proforma_date}
                                    onChange={(event) =>
                                        setField(
                                            "proforma_date",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Expected Shipping Date *</span>

                                <input
                                    type="date"
                                    required
                                    min={form.proforma_date}
                                    value={form.expected_shipping_date}
                                    onChange={(event) =>
                                        setField(
                                            "expected_shipping_date",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Reference</span>

                                <select
                                    value={form.sales_person_id ?? ""}
                                    onChange={(event) =>
                                        setField(
                                            "sales_person_id",
                                            event.target.value
                                                ? Number(event.target.value)
                                                : null
                                        )
                                    }
                                    disabled={employeesLoading}
                                >
                                    <option value="">
                                        {employeesLoading
                                            ? "Loading employees..."
                                            : "Select Employee (Optional)"}
                                    </option>

                                    {employees.map((employee) => (
                                        <option key={employee.id} value={employee.id}>
                                            {employee.employee_name} ({employee.employee_code})
                                        </option>
                                    ))}
                                </select>
                            </label>

    <label>
        <span>Note / Comment *</span>

        <select
            required
            value={commentType}
            onChange={(event) => {
                const value = event.target.value;

                setCommentType(value);

                if (value === "CUSTOM") {
                    setField("comment", customComment);
                } else {
                    setField("comment", value);
                }
            }}
        >
            {COMMENT_OPTIONS.map((option) => (
                <option
                    key={option.value}
                    value={option.value}
                >
                    {option.label}
                </option>
            ))}
        </select>
    </label>

    {commentType === "CUSTOM" && (
        <label>
            <span>Write Custom Comment *</span>

            <textarea
                required
                rows={3}
                maxLength={2000}
                placeholder="Type your custom comment here..."
                value={customComment}
                onChange={(event) => {
                    const value = event.target.value;

                    setCustomComment(value);
                    setField("comment", value);
                }}
            />
        </label>
    )}

                        </div>

                        <section className="order-images">
                            <h3>Order Images</h3>

                            <div className="order-images__grid">
                                {(
                                    [
                                        "image1",
                                        "image2",
                                        "image3",
                                        "image4",
                                    ] as const
                                ).map((key, index) => (
                                    <label key={key}>
                                        <span>Image {index + 1}</span>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(event) => {
                                                const file =
                                                    event.currentTarget.files?.[0] ??
                                                    null;

                                                event.currentTarget.value = "";

                                                if (!file) {
                                                    return;
                                                }

                                                const keys = [
                                                    "image1",
                                                    "image2",
                                                    "image3",
                                                    "image4",
                                                ] as const;

                                                const targetKey =
                                                    existingImages[key]
                                                        ? keys.find(
                                                            (slot) =>
                                                                !existingImages[slot] &&
                                                                !form[slot]
                                                        )
                                                        : key;

                                                if (!targetKey) {
                                                    setError(
                                                        "All four image slots already contain saved images. Existing images were preserved; remove or archive an image before adding another."
                                                    );
                                                    return;
                                                }

                                                setError("");

                                                setForm((previous) => ({
                                                    ...previous,
                                                    [targetKey]: file,
                                                }));
                                            }}
                                        />

                                        {form[key] ? (
                                            <small>
                                                New file: {form[key]?.name}
                                            </small>
                                        ) : existingImages[key] ? (
                                            <a
                                                className="order-existing-image"
                                                href={orderImageUrl(
                                                    existingImages[key]
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <img
                                                    src={orderImageUrl(
                                                        existingImages[key]
                                                    )}
                                                    alt={`Saved order image ${index + 1}`}
                                                    style={{
                                                        display: "block",
                                                        maxWidth: 150,
                                                        maxHeight: 100,
                                                        objectFit: "contain",
                                                        marginTop: 8,
                                                    }}
                                                />

                                                <small>
                                                    Existing image {index + 1}
                                                    {" "}— leave empty to keep
                                                </small>
                                            </a>
                                        ) : (
                                            <small>No image uploaded</small>
                                        )}
                                    </label>
                                ))}
                            </div>

                            {mode === "edit" && (
                                <p className="order-images__hint">
                                    Leave an image field empty to keep the existing image.
                                </p>
                            )}
                        </section>

                        <div className="order-items-heading">
                            <h3>Order Items *</h3>

                            <button type="button" onClick={addItem}>
                                <i className="bi bi-plus-circle" /> Add Item
                            </button>
                        </div>

                        <div className="order-table-wrapper">
                            <table className="order-items-table">
                                <thead>
                                    <tr>
                                        <th>Product *</th>
                                        <th>Unit *</th>
                                        <th>Quantity *</th>
                                        <th>Rate (Incl GST) *</th>
                                        <th>Discount</th>
                                        <th>Amount</th>
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
                                                            {product.product_code
                                                                ? `${product.product_code} — ${product.name}`
                                                                : product.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td>
                                                <input
                                                    required
                                                    value={item.unit}
                                                    maxLength={30}
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
                                                    readOnly
                                                    aria-label={`Rate Matrix rate for item ${index + 1}`}
                                                />

                                                {item.product_id > 0 &&
                                                    form.customer_site_name &&
                                                    getMatrixRate(
                                                        item.product_id
                                                    ) === null && (
                                                        <small className="order-rate-warning">
                                                            No Rate Matrix rate for this site.
                                                        </small>
                                                    )}
                                            </td>

                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.discount}
                                                    onChange={(event) =>
                                                        updateLine(
                                                            index,
                                                            "discount",
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            </td>

                                            <td className="order-amount">
                                                ₹{" "}
                                                {amount(
                                                    item.quantity *
                                                    item.rate_incl_gst -
                                                    item.discount
                                                )}
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="order-remove-item"
                                                    disabled={
                                                        form.items.length === 1
                                                    }
                                                    onClick={() =>
                                                        removeItem(index)
                                                    }
                                                >
                                                    <i className="bi bi-trash" />
                                                    {" "}Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="order-totals">
                            <p>
                                <span>SUBTOTAL</span>
                                <strong>₹ {amount(subtotal)}</strong>
                            </p>

                            <p>
                                <span>TOTAL DISCOUNT</span>
                                <strong>₹ {amount(totalDiscount)}</strong>
                            </p>

                            <p className="order-totals__grand">
                                <span>GRAND TOTAL</span>
                                <strong>₹ {amount(grandTotal)}</strong>
                            </p>
                        </div>
                    </fieldset>

                    <div className="order-form__footer">
                        <button
                            type="submit"
                            disabled={saving || optionsLoading}
                        >
                            {saving
                                ? "Saving..."
                                : mode === "edit"
                                    ? "Update Order"
                                    : "Save Order"}
                        </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {dispatchOrder && (
                <div
                    className="dispatch-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !dispatchSaving
                        ) {
                            setDispatchOrder(null);
                        }
                    }}
                >
                    <section
                        className="dispatch-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="dispatch-modal-title"
                    >
                        <div className="dispatch-modal__header">
                            <div>
                                <h2 id="dispatch-modal-title">
                                    Dispatch Details
                                </h2>

                                <p>Order: {dispatchOrder.pino}</p>
                            </div>

                            <button
                                type="button"
                                className="dispatch-close"
                                aria-label="Close dispatch popup"
                                disabled={dispatchSaving}
                                onClick={() => setDispatchOrder(null)}
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <form onSubmit={submitDispatch}>
                            <div className="dispatch-form-grid">
                                <label>
                                    <span>Dispatch Sequence No *</span>

                                    <input
                                        required
                                        readOnly
                                        value={
                                            dispatchForm.dispatch_sequence_no
                                        }
                                        aria-readonly="true"
                                        title="Generated from Order ID, dispatch month, and year"
                                    />
                                </label>

                                <label>
                                    <span>Date Of Dispatch *</span>

                                    <input
                                        type="date"
                                        required
                                        value={dispatchForm.dispatch_date}
                                        onChange={(event) => {
                                            const date = event.target.value;

                                            setDispatchForm((previous) => ({
                                                ...previous,
                                                dispatch_date: date,
                                                dispatch_sequence_no:
                                                    generateDcsNo(
                                                        dispatchOrder.id,
                                                        date
                                                    ),
                                            }));
                                        }}
                                    />
                                </label>

                                <label>
                                    <span>Driver Name *</span>

                                    <select
                                        required
                                        value={dispatchForm.driver_id}
                                        onChange={(event) =>
                                            selectDriver(event.target.value)
                                        }
                                    >
                                        <option value="">
                                            Select Driver
                                        </option>

                                        {drivers.map((driver) => (
                                            <option
                                                key={driver.id}
                                                value={driver.id}
                                            >
                                                {driver.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span>Vehicle No *</span>

                                    <input
                                        required
                                        value={dispatchForm.vehicle_no}
                                        onChange={(event) =>
                                            setDispatchForm((previous) => ({
                                                ...previous,
                                                vehicle_no: event.target.value,
                                            }))
                                        }
                                        placeholder="Enter vehicle number"
                                    />
                                </label>

                                <label>
                                    <span>Type Of Vehicle *</span>

                                    <select
                                        required
                                        value={dispatchForm.vehicle_type}
                                        onChange={(event) =>
                                            setDispatchForm((previous) => ({
                                                ...previous,
                                                vehicle_type: event.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">
                                            Select Vehicle Type
                                        </option>

                                        {VEHICLE_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span>Contact *</span>

                                    <input
                                        required
                                        type="tel"
                                        maxLength={15}
                                        value={dispatchForm.contact}
                                        onChange={(event) =>
                                            setDispatchForm((previous) => ({
                                                ...previous,
                                                contact: event.target.value,
                                            }))
                                        }
                                        placeholder="Enter contact number"
                                    />
                                </label>

                                <label>
                                    <span>Dispatch Status *</span>

                                    <select
                                        required
                                        value={dispatchForm.dispatch_status}
                                        onChange={(event) =>
                                            setDispatchForm((previous) => ({
                                                ...previous,
                                                dispatch_status:
                                                    event.target.value as DispatchStatus,
                                            }))
                                        }
                                    >
                                        {DISPATCH_STATUSES.map((status) => (
                                            <option
                                                key={status}
                                                value={status}
                                            >
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="dispatch-modal__footer">
                                <button
                                    type="button"
                                    className="dispatch-cancel"
                                    disabled={dispatchSaving}
                                    onClick={() => setDispatchOrder(null)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="dispatch-submit"
                                    disabled={dispatchSaving}
                                >
                                    <i className="bi bi-check-circle" />

                                    {dispatchSaving
                                        ? "Submitting..."
                                        : "Submit"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            <ConfirmDialog
                open={orderToDelete !== null}
                title="Delete Order?"
                message={
                    orderToDelete
                        ? `Are you sure you want to delete ${orderToDelete.pino}? This action cannot be undone.`
                        : ""
                }
                itemName={orderToDelete?.pino || "this order"}
                confirmText="Delete"
                loading={busyId !== null}
                onCancel={() => {
                    if (busyId === null) {
                        setOrderToDelete(null);
                    }
                }}
                onConfirm={() => void removeOrder()}
            />
        </ManagementLayout>
    );
}