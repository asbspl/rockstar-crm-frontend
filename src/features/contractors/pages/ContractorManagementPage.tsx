
import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    getContractors,
    getContractor,
    createContractor,
    updateContractor,
    updateContractorStatus,
    deleteContractor,
    type Contractor,
    type ContractorInput,
} from "../api/contractors.api";

import "./ContractorManagementPage.css";

type Mode = "create" | "edit" | "view";
type Status = "Active" | "Inactive";

type ContractorListRow = Awaited<
    ReturnType<typeof getContractors>
>["rows"][number];

type ContractorListResultRow = ContractorListRow;

type ListPayload = {
    rows?: ContractorListResultRow[];
    total?: number;
    data?: {
        contractors?: ContractorListResultRow[];
        pagination?: {
            total?: number;
            page?: number;
            limit?: number;
            totalPages?: number;
        };
    };
};

const emptyForm: ContractorInput = {
    name: "",
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    location: "",
    state: "",
    city: "",
    pin_code: "",
    pan_card: "",
    pan_card_document: null,
    aadhaar_card: "",
    aadhaar_card_document: null,
    payment_upi: "",
    account_name: "",
    account_number: "",
    ifsc_code: "",
    status: "Active",
};

const locations = [
    "Wanowrie", "Lullanagar", "Kharadi", "Pimple Saudagar",
    "Phursungi", "Lohegaon", "Mundhwa", "Wakad", "Kothrud",
    "Pimpri", "Viman Nagar", "Talegaon", "Parvati",
    "Hinjewadi Phase 3", "Chakan", "Rahatani", "Kiwale",
    "Sinhgad Road", "Ambegaon", "Camp", "Wagholi",
    "Wadgaon Sheri", "Hadapsar", "Ravet", "Dhanori", "Aundh",
    "Shivaji Nagar", "Kolhapur", "Vishrantwadi", "Dighi",
    "Moshi", "Budhwar Peth", "Dhankawadi", "Undri",
    "Mohammadwadi", "Mumbai", "Satara", "Aurangabad",
    "Kondhwa", "Bhosari", "Punawale", "Balewadi",
    "Baner", "Katraj", "Chinchwad", "Alandi", "Bavdhan",
    "Ahmednagar", "Navi Mumbai", "Yerwada", "Mulshi",
    "Akurdi", "Lonavala", "Thane", "Warje", "Dehu",
    "Pashan", "Khadki", "Karvenagar", "Jalna", "Bhukum",
    "Nashik", "Sangli", "Baramati", "Shirur", "Solapur",
    "Pandharpur", "Panvel", "Delhi", "Noida", "Dehradun",
];

function normalizeStatus(value: unknown): Status {
    return String(value ?? "active").toLowerCase() === "inactive"
        ? "Inactive"
        : "Active";
}

function documentUrl(path?: string | null): string {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const base = (
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
    ).replace(/\/+$/, "");

    return `${base.replace(/\/api$/i, "")}/${path.replace(/^\/+/, "")}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
    const response = error as {
        response?: {
            data?: {
                message?: string;
            };
        };
        message?: string;
    };

    return (
        response.response?.data?.message ||
        response.message ||
        fallback
    );
}

export default function ContractorManagementPage() {
    const [contractors, setContractors] = useState<
        ContractorListResultRow[]
    >([]);

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
    const [form, setForm] = useState<ContractorInput>({ ...emptyForm });
    const [existing, setExisting] = useState<Contractor | null>(null);

    const [confirm, setConfirm] = useState<{
        kind: "delete" | "status";
        contractor: ContractorListResultRow;
        nextStatus?: Status;
    } | null>(null);

    const [deletingId, setDeletingId] = useState<number | null>(null);

const loadContractors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
        const result = await getContractors({
            page,
            limit,
            search: search.trim(),
            status:
                statusFilter === "All"
                    ? "All"
                    : statusFilter.toLowerCase(),
        });

        // Support both direct API data and Axios response formats.
        const response = result as unknown as Record<string, unknown>;

        const responseData =
            response.data &&
            typeof response.data === "object"
                ? (response.data as Record<string, unknown>)
                : {};

        const nestedData =
            responseData.data &&
            typeof responseData.data === "object"
                ? (responseData.data as Record<string, unknown>)
                : {};

        const getRows = (value: Record<string, unknown>) => {
            if (Array.isArray(value.contractors)) {
                return value.contractors as ContractorListResultRow[];
            }

            if (Array.isArray(value.rows)) {
                return value.rows as ContractorListResultRow[];
            }

            return null;
        };

        const rows =
            getRows(response) ??
            getRows(responseData) ??
            getRows(nestedData) ??
            [];

        const pagination =
            (nestedData.pagination as Record<string, unknown> | undefined) ??
            (responseData.pagination as Record<string, unknown> | undefined) ??
            (response.pagination as Record<string, unknown> | undefined);

        const count =
            response.total ??
            responseData.total ??
            pagination?.total ??
            rows.length;

        setContractors(rows);
        setTotal(Number(count) || 0);
    } catch (err) {
        setContractors([]);
        setTotal(0);
        setError(
            getErrorMessage(err, "Unable to load contractors.")
        );
    } finally {
        setLoading(false);
    }
}, [page, limit, search, statusFilter]);

    useEffect(() => {
        void loadContractors();
    }, [loadContractors]);



const openForm = async (
    nextMode: Mode,
    contractor?: ContractorListResultRow | Contractor,
) => {
    setError("");
    setNotice("");
    setExisting(null);
    setSelectedId(contractor?.id ?? null);
    setForm({ ...emptyForm });

    if (nextMode === "create" || !contractor) {
        setMode(nextMode);
        return;
    }

    setSaving(true);

    try {
        const result = await getContractor(contractor.id);

        // Handle different API response structures.
        const response = result as unknown as {
            contractor?: Contractor;
            data?: {
                contractor?: Contractor;
                data?: {
                    contractor?: Contractor;
                };
            };
        };

        const full = (
            response.data?.data?.contractor ??
            response.data?.contractor ??
            response.contractor ??
            result
        ) as Contractor;

        if (!full || full.id == null) {
            throw new Error(
                "Contractor details were not found in the API response."
            );
        }

        setExisting(full);

        setForm({
            name: full.name ?? "",
            phone: full.phone ?? "",
            email: full.email ?? "",
            address_line1: full.address_line1 ?? "",
            address_line2: full.address_line2 ?? "",
            location: full.location ?? "",
            state: full.state ?? "",
            city: full.city ?? "",
            pin_code: full.pin_code ?? "",
            pan_card: full.pan_card ?? "",
            pan_card_document: null,
            aadhaar_card: full.aadhaar_card ?? "",
            aadhaar_card_document: null,
            payment_upi: full.payment_upi ?? "",
            account_name: full.account_name ?? "",
            account_number: full.account_number ?? "",
            ifsc_code: full.ifsc_code ?? "",
            status: normalizeStatus(full.status),
        });

        setMode(nextMode);
    } catch (err) {
        setError(
            getErrorMessage(
                err,
                "Unable to load contractor details."
            )
        );
    } finally {
        setSaving(false);
    }
};



    const closeForm = () => {
        setMode(null);
        setSelectedId(null);
        setExisting(null);
        setForm({ ...emptyForm });
        setError("");
    };

    const setField = <K extends keyof ContractorInput>(
        key: K,
        value: ContractorInput[K],
    ) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!mode || mode === "view") return;

        setError("");
        setNotice("");

        if (!/^\d{10}$/.test(form.phone)) {
            setError("Phone number must contain exactly 10 digits.");
            return;
        }

        if (!/^\d{6}$/.test(form.pin_code)) {
            setError("PIN code must contain exactly 6 digits.");
            return;
        }

        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan_card)) {
            setError("Enter a valid PAN number.");
            return;
        }

        if (!/^\d{12}$/.test(form.aadhaar_card)) {
            setError("Aadhaar number must contain exactly 12 digits.");
            return;
        }

        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc_code)) {
            setError("Enter a valid IFSC code.");
            return;
        }

        if (
            mode === "create" &&
            (!form.pan_card_document || !form.aadhaar_card_document)
        ) {
            setError("Upload both PAN and Aadhaar documents.");
            return;
        }

        if (
            mode === "edit" &&
            (
                (!form.pan_card_document && !existing?.pan_card_document) ||
                (!form.aadhaar_card_document &&
                    !existing?.aadhaar_card_document)
            )
        ) {
            setError("Both PAN and Aadhaar documents are required.");
            return;
        }

        setSaving(true);

        try {
            if (mode === "create") {
                await createContractor(form);
            } else if (selectedId !== null) {
                await updateContractor(selectedId, form);
            } else {
                throw new Error("Contractor ID is missing.");
            }

            const successMessage = mode === "create"
                ? "Contractor added successfully."
                : "Contractor updated successfully.";

            closeForm();
            await loadContractors();
            setNotice(successMessage);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save contractor."));
        } finally {
            setSaving(false);
        }
    };

    const performConfirmation = async () => {
        if (!confirm) return;

        const item = confirm;
        setError("");
        setNotice("");

        if (item.kind === "status") {
            try {
                await updateContractorStatus(
                    item.contractor.id,
                    item.nextStatus!,
                );

                setNotice(
                    `Contractor marked ${item.nextStatus!.toLowerCase()}.`,
                );

                setConfirm(null);
                await loadContractors();
            } catch (err) {
                setError(
                    getErrorMessage(err, "Unable to update contractor status."),
                );
            }

            return;
        }

        setDeletingId(item.contractor.id);

        try {
            await deleteContractor(item.contractor.id);
            setConfirm(null);
            setNotice("Contractor deleted successfully.");

            if (contractors.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadContractors();
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to delete contractor."));
        } finally {
            setDeletingId(null);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;

    return (
        <ManagementLayout
            title="Manage Contractor"
            description="Manage contractor details, KYC documents and bank information."
            showForm={mode !== null}
            listTitle="Our Contractor List"
            addButtonText="Add Contractor"
            onAdd={() => void openForm("create")}
            onBack={closeForm}
            formTitle={
                mode === "create"
                    ? "Add Contractor"
                    : mode === "edit"
                        ? "Update Contractor"
                        : "Contractor Details"
            }
            error={
                error ? (
                    <div
                        className="contractor-alert contractor-alert--error"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : null
            }
            notice={
                notice ? (
                    <div
                        className="contractor-alert contractor-alert--success"
                        role="status"
                    >
                        {notice}
                    </div>
                ) : null
            }
            toolbar={
                <>
                    <div className="management-page__toolbar-group">
                        <label htmlFor="contractor-limit">Show</label>
                        <select
                            id="contractor-limit"
                            value={limit}
                            onChange={(event) => {
                                setLimit(Number(event.target.value));
                                setPage(1);
                            }}
                        >
                            {[10, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                        <span>entries</span>
                    </div>

                    <div className="management-page__toolbar-group">
                        <select
                            aria-label="Filter contractor status"
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

                        <label htmlFor="contractor-search">Search:</label>
                        <input
                            id="contractor-search"
                            type="search"
                            value={search}
                            placeholder="Search contractors..."
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
                        {Math.min(
                            startIndex + (contractors ?? []).length,
                            total,
                        )}{" "}
                        of {total} entries
                    </span>

                    <div className="management-page__pagination-controls">
                        <button
                            type="button"
                            disabled={page <= 1 || loading}
                            onClick={() => setPage((current) => current - 1)}
                        >
                            Previous
                        </button>

                        <span>
                            Page {page} of {totalPages}
                        </span>

                        <button
                            type="button"
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            Next
                        </button>
                    </div>
                </>
            }
        >
            {mode === null ? (
                <div className="contractor-table-wrapper">
                    <table className="contractor-table">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                <th>Name</th>
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
                                    <td colSpan={8} className="contractor-empty">
                                        Loading contractors...
                                    </td>
                                </tr>
                            ) : contractors.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="contractor-empty">
                                        No contractors found.
                                    </td>
                                </tr>
                            ) : (
                                contractors.map((contractor, index) => {
                                    const status = normalizeStatus(
                                        contractor.status,
                                    );

                                    return (
                                        <tr key={contractor.id}>
                                            <td>{startIndex + index + 1}</td>
                                            <td className="contractor-name">
                                                {contractor.name}
                                            </td>
                                            <td>{contractor.phone}</td>
                                            <td>{contractor.email}</td>
                                            <td>
                                                {contractor.address_line1 || "—"}
                                            </td>
                                            <td>{contractor.location || "—"}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className={`record-status ${
                                                        status === "Active"
                                                            ? "is-active"
                                                            : "is-inactive"
                                                    }`}
                                                    onClick={() =>
                                                        setConfirm({
                                                            kind: "status",
                                                            contractor,
                                                            nextStatus:
                                                                status === "Active"
                                                                    ? "Inactive"
                                                                    : "Active",
                                                        })
                                                    }
                                                >
                                                    {status}
                                                </button>
                                            </td>
                                            <td>
                                                <div className="contractor-actions">

                                                    <ActionButton
                                                        action="edit"
                                                        type="button"
                                                        title="Edit contractor"
                                                        onClick={() =>
                                                            void openForm(
                                                                "edit",
                                                                contractor,
                                                            )
                                                        }
                                                    />

                                                    <ActionButton
                                                        action="delete"
                                                        type="button"
                                                        title="Delete contractor"
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                        onClick={() =>
                                                            setConfirm({
                                                                kind: "delete",
                                                                contractor,
                                                            })
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
                <form className="contractor-form" onSubmit={submit}>
                    <fieldset disabled={mode === "view" || saving}>
                        <legend>Contractor Information</legend>

                        <div className="contractor-form-grid">
                            <Field label="Name" required>
                                <input
                                    required
                                    value={form.name}
                                    onChange={(event) =>
                                        setField("name", event.target.value)
                                    }
                                />
                            </Field>

                            <Field label="Phone" required>
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
                                                .slice(0, 10),
                                        )
                                    }
                                />
                            </Field>

                            <Field label="Email ID" required>
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={(event) =>
                                        setField("email", event.target.value)
                                    }
                                />
                            </Field>

                            <Field label="Address / Line-1" required>
                                <input
                                    required
                                    value={form.address_line1}
                                    onChange={(event) =>
                                        setField(
                                            "address_line1",
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>

                            <Field label="Line-2">
                                <input
                                    value={form.address_line2 ?? ""}
                                    onChange={(event) =>
                                        setField(
                                            "address_line2",
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>

                            <Field label="Location" required>
                                <select
                                    required
                                    value={form.location}
                                    onChange={(event) =>
                                        setField("location", event.target.value)
                                    }
                                >
                                    <option value="">Select Location</option>
                                    {locations.map((location) => (
                                        <option
                                            key={location}
                                            value={location}
                                        >
                                            {location}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="State" required>
                                <input
                                    required
                                    value={form.state}
                                    onChange={(event) =>
                                        setField("state", event.target.value)
                                    }
                                />
                            </Field>

                            <Field label="City" required>
                                <input
                                    required
                                    value={form.city}
                                    onChange={(event) =>
                                        setField("city", event.target.value)
                                    }
                                />
                            </Field>

                            <Field label="Pin Code" required>
                                <input
                                    required
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={form.pin_code}
                                    onChange={(event) =>
                                        setField(
                                            "pin_code",
                                            event.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 6),
                                        )
                                    }
                                />
                            </Field>

                            <Field label="Status" required>
                                <select
                                    required
                                    value={normalizeStatus(form.status)}
                                    onChange={(event) =>
                                        setField(
                                            "status",
                                            event.target.value as ContractorInput["status"],
                                        )
                                    }
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </Field>
                        </div>
                    </fieldset>

                    <fieldset disabled={mode === "view" || saving}>
                        <legend>KYC &amp; Payment Details</legend>

                        <div className="contractor-form-grid">
                            <Field label="PAN Card" required>
                                <input
                                    required
                                    maxLength={10}
                                    value={form.pan_card}
                                    onChange={(event) =>
                                        setField(
                                            "pan_card",
                                            event.target.value.toUpperCase(),
                                        )
                                    }
                                />
                            </Field>

                            <DocumentField
                                label="Upload PAN Card"
                                existingPath={existing?.pan_card_document}
                                file={form.pan_card_document}
                                required={
                                    mode === "create" ||
                                    !existing?.pan_card_document
                                }
                                disabled={mode === "view" || saving}
                                onChange={(file) =>
                                    setField("pan_card_document", file)
                                }
                            />

                            <Field label="Aadhaar Card" required>
                                <input
                                    required
                                    inputMode="numeric"
                                    maxLength={12}
                                    value={form.aadhaar_card}
                                    onChange={(event) =>
                                        setField(
                                            "aadhaar_card",
                                            event.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 12),
                                        )
                                    }
                                />
                            </Field>

                            <DocumentField
                                label="Upload Aadhaar Card"
                                existingPath={existing?.aadhaar_card_document}
                                file={form.aadhaar_card_document}
                                required={
                                    mode === "create" ||
                                    !existing?.aadhaar_card_document
                                }
                                disabled={mode === "view" || saving}
                                onChange={(file) =>
                                    setField("aadhaar_card_document", file)
                                }
                            />

                            <Field label="Contractor Payment UPI" required>
                                <input
                                    required
                                    value={form.payment_upi}
                                    onChange={(event) =>
                                        setField(
                                            "payment_upi",
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                        </div>
                    </fieldset>

                    <fieldset disabled={mode === "view" || saving}>
                        <legend>Bank Account Details</legend>

                        <div className="contractor-form-grid">
                            <Field label="Account Name" required>
                                <input
                                    required
                                    value={form.account_name}
                                    onChange={(event) =>
                                        setField(
                                            "account_name",
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>

                            <Field label="Account Number" required>
                                <input
                                    required
                                    value={form.account_number}
                                    onChange={(event) =>
                                        setField(
                                            "account_number",
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>

                            <Field label="IFSC Code" required>
                                <input
                                    required
                                    maxLength={11}
                                    value={form.ifsc_code}
                                    onChange={(event) =>
                                        setField(
                                            "ifsc_code",
                                            event.target.value.toUpperCase(),
                                        )
                                    }
                                />
                            </Field>
                        </div>
                    </fieldset>

                    {mode === "view" && existing && (
                        <p className="contractor-readonly">
                            Contractor ID: CTR-
                            {String(existing.id).padStart(4, "0")}
                        </p>
                    )}

                    <footer className="contractor-form-footer">
                        {mode !== "view" && (
                            <button
                                type="submit"
                                className="contractor-primary"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : mode === "create"
                                        ? "Save Contractor"
                                        : "Update Contractor"}
                            </button>
                        )}

                        <button
                            type="button"
                            className="contractor-secondary"
                            onClick={closeForm}
                            disabled={saving}
                        >
                            {mode === "view" ? "Back to List" : "Cancel"}
                        </button>

                        {mode === "view" && (
                            <button
                                type="button"
                                className="contractor-primary"
                                onClick={() => {
                                    if (existing) {
                                        void openForm("edit", existing);
                                    }
                                }}
                            >
                                Edit Contractor
                            </button>
                        )}
                    </footer>
                </form>
            )}

            <ConfirmDialog
                open={confirm !== null}
                title={
                    confirm?.kind === "delete"
                        ? "Delete Contractor?"
                        : "Change Contractor Status?"
                }
                message={
                    confirm?.kind === "delete"
                        ? "Are you sure you want to delete this contractor?"
                        : `Change ${confirm?.contractor.name}'s status to ${confirm?.nextStatus}?`
                }
                itemName={confirm?.contractor.name}
                confirmText={
                    confirm?.kind === "delete"
                        ? "Delete Contractor"
                        : "Change Status"
                }
                loading={deletingId !== null}
                onCancel={() => {
                    if (deletingId === null) {
                        setConfirm(null);
                    }
                }}
                onConfirm={() => void performConfirmation()}
            />
        </ManagementLayout>
    );
}

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <label className="contractor-field">
            <span>
                {label}
                {required && <b> *</b>}
            </span>
            {children}
        </label>
    );
}

function DocumentField({
    label,
    existingPath,
    file,
    required,
    disabled,
    onChange,
}: {
    label: string;
    existingPath?: string | null;
    file: File | null;
    required: boolean;
    disabled: boolean;
    onChange: (file: File | null) => void;
}) {
    return (
        <div className="contractor-field">
            <label>
                {label} <b>*</b>
            </label>

            {existingPath && (
                <div className="contractor-existing-document">
                    <span>Existing document saved.</span>
                    <a
                        href={documentUrl(existingPath)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        View current file
                    </a>
                </div>
            )}

            <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required={required}
                disabled={disabled}
                onChange={(event) =>
                    onChange(event.target.files?.[0] ?? null)
                }
            />

            <small>
                {file?.name || "PDF, JPG or PNG · Max 5 MB"}
            </small>
        </div>
    );
}
