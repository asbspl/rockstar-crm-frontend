import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";
import { State, City, Country } from "country-state-city";

import {
    createCompany,
    getCompanies,
    updateCompany,
    deleteCompany,
    updateCompanyStatus,
    type Company,
} from "../api/companies.api";

import "./CompanyManagementPage.css";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";
import ActionButton from "../../../components/common/ActionButton/ActionButton";

const emptyForm = {
    companyName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    country: "India",
    state: "",
    city: "",
    pinCode: "",
    bankDetails: "",
    termsAndConditions: "",
    panNumber: "",
    gstNumber: "",
};

const fileFields = [
    { name: "companyLogo", label: "Company Logo" },
    { name: "companySignature", label: "Company Signature" },
    { name: "panDocument", label: "Upload PAN Card" },
    { name: "gstCertificate", label: "Upload GST Certificate" },
] as const;

type FileField = (typeof fileFields)[number]["name"];
type CompanyStatus = "active" | "inactive";
type CompanyStatusFilter = "all" | CompanyStatus;

function getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (
            error as {
                response?: {
                    data?: { message?: string };
                };
            }
        ).response;

        if (response?.data?.message) {
            return response.data.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/api\/?$/, "");

function getFileUrl(filePath: string | null | undefined): string {
    if (!filePath?.trim()) return "";

    const value = filePath.trim().replace(/\\/g, "/");

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    return `${API_BASE_URL}/${value.replace(/^\/+/, "")}`;
}

function normalizeStatus(status: unknown): CompanyStatus {
    return String(status).toLowerCase() === "active"
        ? "active"
        : "inactive";
}

export default function CompanyManagementPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] =
        useState<CompanyStatusFilter>("all");

    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [showForm, setShowForm] = useState(false);
    const [editingCompany, setEditingCompany] =
        useState<Company | null>(null);

    const [form, setForm] = useState({ ...emptyForm });
    const [files, setFiles] = useState<Partial<Record<FileField, File>>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [changingStatusId, setChangingStatusId] = useState<number | null>(
        null,
    );

    const [companyToDelete, setCompanyToDelete] =
        useState<Company | null>(null);
    const [companyToChangeStatus, setCompanyToChangeStatus] =
        useState<Company | null>(null);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const countries = useMemo(() => Country.getAllCountries(), []);

    const selectedCountry = countries.find(
        (country) => country.name === form.country,
    );

    const states = useMemo(
        () =>
            selectedCountry
                ? State.getStatesOfCountry(selectedCountry.isoCode)
                : [],
        [selectedCountry],
    );

    const selectedState = states.find(
        (state) => state.name === form.state,
    );

    const cities = useMemo(
        () =>
            selectedCountry && selectedState
                ? City.getCitiesOfState(
                      selectedCountry.isoCode,
                      selectedState.isoCode,
                  )
                : [],
        [selectedCountry, selectedState],
    );

    const loadCompanies = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getCompanies({
                page,
                limit,
                search: search.trim(),
                status: filterStatus,
            });

            setCompanies(result.companies);
            setTotal(result.pagination.total);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load companies."));
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, filterStatus]);

    useEffect(() => {
        void loadCompanies();
    }, [loadCompanies]);

    function updateField(field: keyof typeof emptyForm, value: string) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function openAddForm() {
        setEditingCompany(null);
        setForm({ ...emptyForm });
        setFiles({});
        setError("");
        setNotice("");
        setShowForm(true);
    }

    function openEditForm(company: Company) {
        setEditingCompany(company);

        setForm({
            companyName: company.company_name || "",
            phone: company.phone || "",
            email: company.email || "",
            addressLine1: company.address_line1 || "",
            addressLine2: company.address_line2 || "",
            country: company.country || "India",
            state: company.state || "",
            city: company.city || "",
            pinCode: company.pin_code || "",
            bankDetails: company.bank_details || "",
            termsAndConditions: company.terms_and_conditions || "",
            panNumber: company.pan_number || "",
            gstNumber: company.gst_number || "",
        });

        setFiles({});
        setError("");
        setNotice("");
        setShowForm(true);
    }

    function closeForm() {
        if (saving) return;

        setShowForm(false);
        setEditingCompany(null);
        setForm({ ...emptyForm });
        setFiles({});
        setError("");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (saving) return;

        setError("");
        setNotice("");

        if (!editingCompany) {
            const missingFile = fileFields.find(
                (field) => !files[field.name],
            );

            if (missingFile) {
                setError(`${missingFile.label} is required.`);
                return;
            }
        }

        setSaving(true);

        try {
            const data = new FormData();

            Object.entries(form).forEach(([key, value]) => {
                data.append(key, value);
            });

            fileFields.forEach(({ name }) => {
                const file = files[name];

                if (file) {
                    data.append(name, file);
                }
            });

            const result = editingCompany
                ? await updateCompany(editingCompany.id, data)
                : await createCompany(data);

            setNotice(
                result.message ||
                    (editingCompany
                        ? "Company updated successfully."
                        : "Company created successfully."),
            );

            setShowForm(false);
            setEditingCompany(null);
            setForm({ ...emptyForm });
            setFiles({});

            if (!editingCompany) {
                setPage(1);
            } else {
                await loadCompanies();
            }
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    editingCompany
                        ? "Unable to update company."
                        : "Unable to create company.",
                ),
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(company: Company) {
        if (deletingId !== null) return;

        setError("");
        setNotice("");
        setDeletingId(company.id);

        try {
            const result = await deleteCompany(company.id);

            setCompanyToDelete(null);
            setNotice(result.message || "Company deleted successfully.");

            if (companies.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadCompanies();
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to delete company."));
        } finally {
            setDeletingId(null);
        }
    }

async function handleStatusChange() {
    if (!companyToChangeStatus || changingStatusId !== null) return;

    const company = companyToChangeStatus;

    const nextStatus: CompanyStatus =
        normalizeStatus(company.status) === "active"
            ? "inactive"
            : "active";

    setError("");
    setNotice("");
    setChangingStatusId(company.id);

    try {
const result = await updateCompanyStatus(
    company.id,
    company,
    nextStatus
);

        const updatedCompany = result?.data?.company;

        // Update the displayed status immediately.
        setCompanies((current) =>
            current.map((item) =>
                item.id === company.id
                    ? {
                          ...item,
                          status: updatedCompany?.status ?? nextStatus,
                      }
                    : item
            )
        );

        setCompanyToChangeStatus(null);

        setNotice(
            `${company.company_name} status changed to ${
                updatedCompany?.status ?? nextStatus
            } successfully.`
        );

        // Reload to verify the saved status from the database.
        await loadCompanies();
    } catch (err) {
        setError(
            getErrorMessage(err, "Unable to update company status.")
        );
    } finally {
        setChangingStatusId(null);
    }
}


    const totalPages = Math.max(1, Math.ceil(total / limit));
    const firstEntry = total === 0 ? 0 : (page - 1) * limit + 1;
    const lastEntry = Math.min(page * limit, total);

    function renderFileField(
        name: FileField,
        label: string,
        accept: string,
        requiredOnCreate: boolean,
    ) {
        const existingPath =
            name === "companyLogo"
                ? editingCompany?.company_logo
                : name === "companySignature"
                  ? editingCompany?.company_signature
                  : name === "panDocument"
                    ? editingCompany?.pan_document
                    : editingCompany?.gst_certificate;

        const previewUrl = getFileUrl(existingPath);
        const selectedFile = files[name];

        const isImage = (path: string) =>
            /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(path);

        const selectedFileUrl = selectedFile
            ? URL.createObjectURL(selectedFile)
            : "";

        return (
            <div className="company-field" key={name}>
                <label htmlFor={`company-file-${name}`}>
                    {label}
                    {requiredOnCreate && !editingCompany && <b> *</b>}
                </label>

                {existingPath && (
                    <div className="company-file-preview">
                        {isImage(existingPath) ? (
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <img
                                    src={previewUrl}
                                    alt={`Existing ${label}`}
                                    className="company-preview-image"
                                />
                            </a>
                        ) : (
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                View existing {label}
                            </a>
                        )}

                        <small>Existing {label}</small>
                    </div>
                )}

                <input
                    id={`company-file-${name}`}
                    type="file"
                    accept={accept}
                    required={requiredOnCreate && !editingCompany}
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        setFiles((current) => {
                            const next = { ...current };

                            if (file) {
                                next[name] = file;
                            } else {
                                delete next[name];
                            }

                            return next;
                        });
                    }}
                />

                {selectedFile && (
                    <div className="company-file-preview">
                        {selectedFile.type.startsWith("image/") ? (
                            <img
                                src={selectedFileUrl}
                                alt={`New ${label}`}
                                className="company-preview-image"
                            />
                        ) : (
                            <a
                                href={selectedFileUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                View selected document
                            </a>
                        )}

                        <small>Selected: {selectedFile.name}</small>
                    </div>
                )}

                <small>
                    {name === "companyLogo" ||
                    name === "companySignature"
                        ? "PNG, JPG or WEBP · Maximum 5 MB"
                        : "PDF, PNG, JPG or WEBP · Maximum 5 MB"}
                    {editingCompany && existingPath
                        ? " · Existing document is kept unless replaced."
                        : ""}
                </small>
            </div>
        );
    }

    const statusTarget = companyToChangeStatus
        ? normalizeStatus(companyToChangeStatus.status) === "active"
            ? "inactive"
            : "active"
        : "";

    return (
        <ManagementLayout
            title="Manage Company"
            description="Manage company information, documents and status."
            showForm={showForm}
            listTitle="Our Company List"
            addButtonText="Add Company"
            onAdd={openAddForm}
            onBack={closeForm}
            formTitle={
                editingCompany ? "Edit Company Form" : "Add New Company Form"
            }
            error={
                error ? (
                    <div
                        className="company-alert company-alert-error"
                        role="alert"
                    >
                        {error}
                    </div>
                ) : null
            }
            notice={
                notice ? (
                    <div
                        className="company-alert company-alert-success"
                        role="status"
                    >
                        {notice}
                        <button
                            type="button"
                            onClick={() => setNotice("")}
                        >
                            Dismiss
                        </button>
                    </div>
                ) : null
            }
            toolbar={
                <>
                    <label className="management-page__toolbar-group">
                        <span>Show</span>

                        <select
                            aria-label="Entries per page"
                            value={limit}
                            onChange={(event) => {
                                setLimit(Number(event.target.value));
                                setPage(1);
                            }}
                        >
                            {[10, 25, 50, 100].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>

                        <span>entries</span>
                    </label>

                    <div className="management-toolbar-right">
                        <select
                            aria-label="Filter company status"
                            value={filterStatus}
                            onChange={(event) => {
                                setFilterStatus(
                                    event.target.value as CompanyStatusFilter,
                                );
                                setPage(1);
                            }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <label>
                            Search:{" "}
                            <input
                                type="search"
                                value={search}
                                placeholder="Search companies..."
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </label>
                    </div>
                </>
            }
            pagination={
                <>
                    <span className="management-page__pagination-info">
                        Showing {firstEntry} to {lastEntry} of {total} entries
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

                        <span className="management-page__pagination-info">
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
            {showForm ? (
                <form className="company-card" onSubmit={handleSubmit}>
                    <div className="company-form-grid">
                        {renderFileField(
                            "companyLogo",
                            "Company Logo",
                            "image/png,image/jpeg,image/webp",
                            true,
                        )}

                        {renderFileField(
                            "companySignature",
                            "Company Signature",
                            "image/png,image/jpeg,image/webp",
                            true,
                        )}

                        <label className="company-field">
                            <span>Company Name <b>*</b></span>
                            <input
                                required
                                maxLength={200}
                                value={form.companyName}
                                onChange={(event) =>
                                    updateField("companyName", event.target.value)
                                }
                                placeholder="Enter company name"
                            />
                        </label>

                        <label className="company-field">
                            <span>Phone <b>*</b></span>
                            <input
                                required
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                minLength={10}
                                pattern="[0-9]{10}"
                                value={form.phone}
                                onChange={(event) =>
                                    updateField(
                                        "phone",
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 10),
                                    )
                                }
                                placeholder="Enter 10-digit phone number"
                                title="Please enter exactly 10 digits."
                            />
                        </label>

                        <label className="company-field">
                            <span>Email ID <b>*</b></span>
                            <input
                                required
                                type="email"
                                maxLength={254}
                                value={form.email}
                                onChange={(event) =>
                                    updateField("email", event.target.value)
                                }
                                placeholder="Enter email address"
                            />
                        </label>

                        <label className="company-field">
                            <span>Address / Line-1 <b>*</b></span>
                            <input
                                required
                                value={form.addressLine1}
                                onChange={(event) =>
                                    updateField("addressLine1", event.target.value)
                                }
                                placeholder="Building, street and address"
                            />
                        </label>

                        <label className="company-field">
                            <span>Line-2</span>
                            <input
                                value={form.addressLine2}
                                onChange={(event) =>
                                    updateField("addressLine2", event.target.value)
                                }
                                placeholder="Landmark or additional address"
                            />
                        </label>

                        <label className="company-field">
                            <span>Country <b>*</b></span>
                            <select
                                className="city-dropdown"
                                required
                                value={form.country}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        country: event.target.value,
                                        state: "",
                                        city: "",
                                    }))
                                }
                            >
                                <option value="">Select Country</option>
                                {countries.map((country) => (
                                    <option
                                        key={country.isoCode}
                                        value={country.name}
                                    >
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="company-field">
                            <span>State <b>*</b></span>
                            <select
                                className="city-dropdown"
                                required
                                value={form.state}
                                disabled={!selectedCountry}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        state: event.target.value,
                                        city: "",
                                    }))
                                }
                            >
                                <option value="">Select State</option>
                                {states.map((state) => (
                                    <option
                                        key={state.isoCode}
                                        value={state.name}
                                    >
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="company-field">
                            <span>City <b>*</b></span>
                            <select
                                className="city-dropdown"
                                required
                                value={form.city}
                                disabled={!selectedState}
                                onChange={(event) =>
                                    updateField("city", event.target.value)
                                }
                            >
                                <option value="">Select City</option>
                                {cities.map((city, index) => (
                                    <option
                                        key={`${city.name}-${index}`}
                                        value={city.name}
                                    >
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="company-field">
                            <span>Pin Code <b>*</b></span>
                            <input
                                required
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                minLength={6}
                                pattern="[0-9]{6}"
                                value={form.pinCode}
                                onChange={(event) =>
                                    updateField(
                                        "pinCode",
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6),
                                    )
                                }
                                placeholder="Enter 6-digit PIN code"
                                title="Please enter exactly 6 digits."
                            />
                        </label>
                    </div>

                    <h3 className="company-section-title">Bank & Terms</h3>

                    <div className="company-form-grid">
                        <label className="company-field">
                            <span>Bank Details <b>*</b></span>
                            <textarea
                                required
                                rows={4}
                                value={form.bankDetails}
                                onChange={(event) =>
                                    updateField("bankDetails", event.target.value)
                                }
                                placeholder="Bank name, account holder, account number and IFSC"
                            />
                        </label>

                        <label className="company-field">
                            <span>Terms And Conditions <b>*</b></span>
                            <textarea
                                required
                                rows={4}
                                value={form.termsAndConditions}
                                onChange={(event) =>
                                    updateField(
                                        "termsAndConditions",
                                        event.target.value,
                                    )
                                }
                                placeholder="Enter company terms and conditions"
                            />
                        </label>
                    </div>

                    <h3 className="company-section-title">KYC</h3>

                    <div className="company-form-grid">
                        <label className="company-field">
                            <span>PAN Card Number <b>*</b></span>
                            <input
                                required
                                maxLength={20}
                                value={form.panNumber}
                                onChange={(event) =>
                                    updateField(
                                        "panNumber",
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="Enter PAN number"
                            />
                        </label>

                        <label className="company-field">
                            <span>GST Number <b>*</b></span>
                            <input
                                required
                                maxLength={30}
                                value={form.gstNumber}
                                onChange={(event) =>
                                    updateField(
                                        "gstNumber",
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="Enter GST number"
                            />
                        </label>

                        {renderFileField(
                            "panDocument",
                            "Upload PAN Card",
                            ".pdf,.png,.jpg,.jpeg,.webp,application/pdf",
                            true,
                        )}

                        {renderFileField(
                            "gstCertificate",
                            "Upload GST Certificate",
                            ".pdf,.png,.jpg,.jpeg,.webp,application/pdf",
                            true,
                        )}
                    </div>

                    <div className="company-form-actions">
                        <button
                            type="submit"
                            className="company-primary-button"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : editingCompany
                                  ? "Update Company"
                                  : "Save Company"}
                        </button>

                        <button
                            type="button"
                            className="company-secondary-button"
                            disabled={saving}
                            onClick={closeForm}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="company-table-wrapper">
                        <table className="company-table">
                            <thead>
                                <tr>
                                    <th>S/n</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Address</th>
                                    <th>City</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="company-table-message">
                                            Loading companies...
                                        </td>
                                    </tr>
                                ) : companies.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="company-table-message">
                                            No companies found.
                                        </td>
                                    </tr>
                                ) : (
                                    companies.map((company, index) => {
                                        const status = normalizeStatus(company.status);

                                        return (
                                            <tr key={company.id}>
                                                <td>
                                                    {(page - 1) * limit + index + 1}
                                                </td>

                                                <td>{company.company_name || "—"}</td>
                                                <td>{company.phone || "—"}</td>
                                                <td>{company.email || "—"}</td>

                                                <td>
                                                    {[
                                                        company.address_line1,
                                                        company.address_line2,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(", ") || "—"}
                                                </td>

                                                <td>{company.city || "—"}</td>

                                                <td>
                                                    <button
                                                        type="button"
                                                        title="Click to change company status"
                                                        className={`company-status ${
                                                            status === "active"
                                                                ? "company-status-active"
                                                                : "company-status-inactive"
                                                        }`}
                                                        disabled={
                                                            changingStatusId !== null ||
                                                            deletingId !== null
                                                        }
                                                        onClick={() =>
                                                            setCompanyToChangeStatus(company)
                                                        }
                                                    >
                                                        {status === "active"
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </button>
                                                </td>

                                                <td>
                                                    <div className="company-action-buttons">
                                                        <ActionButton
                                                            action="edit"
                                                            type="button"
                                                            title="Edit company"
                                                            onClick={() =>
                                                                openEditForm(company)
                                                            }
                                                        />

                                                        <ActionButton
                                                            action="delete"
                                                            type="button"
                                                            title="Delete company"
                                                            disabled={
                                                                deletingId !== null ||
                                                                changingStatusId !== null
                                                            }
                                                            onClick={() =>
                                                                setCompanyToDelete(company)
                                                            }
                                                        >
                                                            {deletingId === company.id
                                                                ? "Deleting..."
                                                                : "Delete"}
                                                        </ActionButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <ConfirmDialog
                        open={companyToDelete !== null}
                        title="Delete Company?"
                        message="Are you sure you want to delete this company?"
                        itemName={
                            companyToDelete?.company_name || "this company"
                        }
                        confirmText="Delete Company"
                        loading={deletingId !== null}
                        onCancel={() => {
                            if (deletingId === null) {
                                setCompanyToDelete(null);
                            }
                        }}
                        onConfirm={() => {
                            if (
                                companyToDelete &&
                                deletingId === null
                            ) {
                                void handleDelete(companyToDelete);
                            }
                        }}
                    />

                    <ConfirmDialog
                        open={companyToChangeStatus !== null}
                        title="Change Company Status?"
                        message={
                            companyToChangeStatus
                                ? `Are you sure you want to change ${companyToChangeStatus.company_name}'s status to ${statusTarget}?`
                                : ""
                        }
                        itemName={companyToChangeStatus?.company_name || "this company"}
                        confirmText={
                            statusTarget === "active"
                                ? "Activate Company"
                                : "Deactivate Company"
                        }
                        loading={changingStatusId !== null}
                        onCancel={() => {
                            if (changingStatusId === null) {
                                setCompanyToChangeStatus(null);
                            }
                        }}
                        onConfirm={() => {
                            if (
                                companyToChangeStatus &&
                                changingStatusId === null
                            ) {
                                void handleStatusChange();
                            }
                        }}
                    />
                </>
            )}
        </ManagementLayout>
    );
}