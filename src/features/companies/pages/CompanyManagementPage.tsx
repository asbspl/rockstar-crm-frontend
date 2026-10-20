
import { useEffect, useState, useMemo, type FormEvent } from "react";
import { State, City, Country } from "country-state-city";
import {
    createCompany,
    getCompanies,
    updateCompany,
    deleteCompany,
    type Company,
} from "../api/companies.api";
import "./CompanyManagementPage.css";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

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

function getErrorMessage(error: unknown, fallback: string): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function getFileUrl(filePath: string | null | undefined): string {
    if (!filePath?.trim()) return "";

    const value = filePath.trim().replace(/\\/g, "/");

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    const baseUrl = API_BASE_URL.replace(/\/+$/, "");
    const relativePath = value.replace(/^\/+/, "");

    return `${baseUrl}/${relativePath}`;
}

function CompanyManagementPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [showForm, setShowForm] = useState(false);
    const [editingCompany, setEditingCompany] =
        useState<Company | null>(null);

    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState<
        Partial<Record<FileField, File>>
    >({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function loadCompanies(
        requestedPage = page,
        requestedLimit = limit,
        requestedSearch = search.trim()
    ) {
        setLoading(true);
        setError("");

        try {
            const result = await getCompanies({
                page: requestedPage,
                limit: requestedLimit,
                search: requestedSearch,
            });

            setCompanies(result.companies);
            setTotal(result.pagination.total);
            setTotalPages(result.pagination.totalPages);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load companies."));
        } finally {
            setLoading(false);
        }
    }

    const countries = useMemo(() => Country.getAllCountries(), []);

    const selectedCountry = countries.find(
        (country) => country.name === form.country
    );

    const states = useMemo(
        () =>
            selectedCountry
                ? State.getStatesOfCountry(selectedCountry.isoCode)
                : [],
        [selectedCountry?.isoCode]
    );

    const selectedState = states.find(
        (state) => state.name === form.state
    );

    const cities = useMemo(
        () =>
            selectedCountry && selectedState
                ? City.getCitiesOfState(
                    selectedCountry.isoCode,
                    selectedState.isoCode
                )
                : [],
        [selectedCountry?.isoCode, selectedState?.isoCode]
    );
    useEffect(() => {
        void loadCompanies(page, limit, search.trim());
        // Load the list when its filters or page change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, search]);

    function updateField(
        field: keyof typeof emptyForm,
        value: string
    ) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    function openAddForm() {
        setEditingCompany(null);
        setForm({ ...emptyForm });
        setFiles({});
        setError("");
        setSuccess("");
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
        setSuccess("");
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingCompany(null);
        setForm({ ...emptyForm });
        setFiles({});
        setError("");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (saving) return;

        if (!editingCompany) {
            const missingFile = fileFields.find(
                (field) => !files[field.name]
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

            const message =
                result.message ||
                (editingCompany
                    ? "Company updated successfully."
                    : "Company created successfully.");

            const targetPage = editingCompany ? page : 1;
            const targetSearch = search.trim();

            setSuccess(message);
            setShowForm(false);
            setEditingCompany(null);
            setForm({ ...emptyForm });
            setFiles({});
            setPage(targetPage);

            await loadCompanies(targetPage, limit, targetSearch);
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    editingCompany
                        ? "Unable to update company."
                        : "Unable to create company."
                )
            );
        } finally {
            setSaving(false);
        }
    }


    async function handleDelete(company: Company) {
        if (deletingId !== null) return;

        setError("");
        setSuccess("");
        setDeletingId(company.id);

        try {
            const result = await deleteCompany(company.id);

            setSuccess(
                result.message || "Company deleted successfully."
            );

            const nextPage =
                companies.length === 1 && page > 1
                    ? page - 1
                    : page;

            setCompanyToDelete(null);
            setPage(nextPage);

            await loadCompanies(nextPage, limit, search.trim());
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to delete company.")
            );
        } finally {
            setDeletingId(null);
        }
    }


    const firstEntry =
        total === 0 ? 0 : (page - 1) * limit + 1;
    const lastEntry = Math.min(page * limit, total);

    return (
        <div className="company-page">
            <div className="company-page-heading">
                <div>
                    <h1>Manage Company</h1>
                    <p>
                        {showForm
                            ? editingCompany
                                ? "Update company information"
                                : "You can add a new company from here"
                            : "Our Company List"}
                    </p>
                </div>

                <button
                    type="button"
                    className="company-primary-button"
                    onClick={() => {
                        if (showForm) {
                            closeForm();
                        } else {
                            openAddForm();
                        }
                    }}
                >
                    <i
                        className={`bi ${showForm ? "bi-arrow-left" : "bi-plus-lg"
                            }`}
                    />
                    {showForm ? "Back to Companies" : "Add Company"}
                </button>
            </div>

            {error && (
                <div
                    className="company-alert company-alert-error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {success && !showForm && (
                <div
                    className="company-alert company-alert-success"
                    role="status"
                >
                    {success}
                    <button
                        type="button"
                        onClick={() => setSuccess("")}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {showForm ? (
                <form className="company-card" onSubmit={handleSubmit}>
                    <div className="company-card-heading">
                        <h2>
                            {editingCompany
                                ? "Edit Company Form"
                                : "Add New Company Form"}
                        </h2>
                        <p>
                            Enter company information and upload documents.
                            {editingCompany &&
                                " Existing documents can be kept without uploading them again."}
                        </p>
                    </div>

                    <h3 className="company-section-title">
                        Company Information
                    </h3>

                    <div className="company-form-grid">



{fileFields.slice(0, 2).map(({ name, label }) => {
    const existingPath =
        name === "companyLogo"
            ? editingCompany?.company_logo
            : editingCompany?.company_signature;

    const previewUrl = getFileUrl(existingPath);

    return (
        <label className="company-field" key={name}>
            <span>
                {label} {!editingCompany && <b>*</b>}
            </span>

            {editingCompany && (
                <div className="company-file-preview">
                    {previewUrl ? (
                        <>
                            <img
                                key={previewUrl}
                                src={previewUrl}
                                alt={label}
                                className="company-preview-image"
                                onLoad={() => {
                                    console.log(
                                        `${label} loaded:`,
                                        previewUrl
                                    );
                                }}
                                onError={(event) => {
                                    console.error(
                                        `${label} failed to load:`,
                                        event.currentTarget.src
                                    );
                                }}
                            />
                            <small>Existing {label}</small>
                        </>
                    ) : (
                        <small>
                            No existing {label.toLowerCase()} path was returned by the API.
                        </small>
                    )}
                </div>
            )}

            <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required={!editingCompany}
                onChange={(event) => {
                    const file = event.target.files?.[0];

                    setFiles((current) => ({
                        ...current,
                        [name]: file,
                    }));
                }}
            />

            {files[name] && (
                <div className="company-file-preview">
                    <img
                        src={URL.createObjectURL(files[name]!)}
                        alt={`New ${label}`}
                        className="company-preview-image"
                    />
                    <small>New {label} preview</small>
                </div>
            )}

            <small>PNG, JPG or WEBP · Maximum 5 MB</small>
        </label>
    );
})}



                        <label className="company-field">
                            <span>Company Name <b>*</b></span>
                            <input
                                required
                                maxLength={200}
                                value={form.companyName}
                                onChange={(e) =>
                                    updateField("companyName", e.target.value)
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
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    updateField("phone", value);
                                }}
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
                                onChange={(e) =>
                                    updateField("email", e.target.value)
                                }
                                placeholder="Enter email address"
                            />
                        </label>

                        <label className="company-field">
                            <span>Address / Line-1 <b>*</b></span>
                            <input
                                required
                                value={form.addressLine1}
                                onChange={(e) =>
                                    updateField("addressLine1", e.target.value)
                                }
                                placeholder="Building, street and address"
                            />
                        </label>

                        <label className="company-field">
                            <span>Line-2</span>
                            <input
                                value={form.addressLine2}
                                onChange={(e) =>
                                    updateField("addressLine2", e.target.value)
                                }
                                placeholder="Landmark or additional address"
                            />
                        </label>

                        <label className="company-field">
                            <span>Country <b>*</b></span>
                            <select
                                className="company-country-select"
                                required
                                value={form.country}
                                onChange={(e) => {
                                    setForm((current) => ({
                                        ...current,
                                        country: e.target.value,
                                        state: "",
                                        city: "",
                                    }));
                                }}
                            >
                                <option value="">Select Country</option>
                                {countries.map((country) => (
                                    <option key={country.isoCode} value={country.name}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="company-field">
                            <span>State <b>*</b></span>
                            <select
                                className="company-country-select"
                                required
                                value={form.state}
                                onChange={(e) => {
                                    setForm((current) => ({
                                        ...current,
                                        state: e.target.value,
                                        city: "",
                                    }));
                                }}
                                disabled={!selectedCountry}
                            >
                                <option value="">Select State</option>
                                {states.map((state) => (
                                    <option key={state.isoCode} value={state.name}>
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="company-field">
                            <span>City <b>*</b></span>
                            <select
                                className="company-country-select"
                                required
                                value={form.city}
                                onChange={(e) => updateField("city", e.target.value)}
                                disabled={!selectedState}
                            >
                                <option value="">Select City</option>
                                {cities.map((city, index) => (
                                    <option key={`${city.name}-${index}`} value={city.name}>
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
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                                    updateField("pinCode", value);
                                }}
                                placeholder="Enter 6-digit PIN code"
                                title="Please enter exactly 6 digits."
                            />
                        </label>

                    </div>

                    <h3 className="company-section-title">
                        Bank & Terms
                    </h3>

                    <div className="company-form-grid">
                        <label className="company-field">
                            <span>Bank Details <b>*</b></span>
                            <textarea
                                required
                                rows={4}
                                value={form.bankDetails}
                                onChange={(e) =>
                                    updateField("bankDetails", e.target.value)
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
                                onChange={(e) =>
                                    updateField("termsAndConditions", e.target.value)
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
                                onChange={(e) =>
                                    updateField("panNumber", e.target.value)
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
                                onChange={(e) =>
                                    updateField("gstNumber", e.target.value)
                                }
                                placeholder="Enter GST number"
                            />
                        </label>
              
<label className="company-field">
  <span>
    Upload PAN Card {!editingCompany && <b>*</b>}
  </span>

  {/* Existing PAN document preview */}
  {editingCompany?.pan_document && (
    <div className="company-file-preview">
      {/\.(png|jpe?g|webp)(\?.*)?$/i.test(
        editingCompany.pan_document
      ) ? (
        <img
          src={getFileUrl(editingCompany.pan_document)}
          alt="Existing PAN card"
          className="company-preview-image"
        />
      ) : (
        <a
          href={getFileUrl(editingCompany.pan_document)}
          target="_blank"
          rel="noreferrer"
        >
          View existing PAN document
        </a>
      )}
      <small>Existing PAN document</small>
    </div>
  )}

  <input
    type="file"
    accept="image/png,image/jpeg,image/webp,application/pdf"
    required={!editingCompany}
    onChange={(e) =>
      setFiles((current) => ({
        ...current,
        panDocument: e.target.files?.[0],
      }))
    }
  />

  {/* Preview newly selected PAN file */}
  {files.panDocument && (
    <div className="company-file-preview">
      {files.panDocument.type.startsWith("image/") ? (
        <img
          src={URL.createObjectURL(files.panDocument)}
          alt="New PAN card preview"
          className="company-preview-image"
        />
      ) : (
        <a
          href={URL.createObjectURL(files.panDocument)}
          target="_blank"
          rel="noreferrer"
        >
          View new PAN document (PDF)
        </a>
      )}
      <small>New PAN document: {files.panDocument.name}</small>
    </div>
  )}

  <small>PDF, PNG, JPG or WEBP · Maximum 5 MB</small>
</label>




<label className="company-field">
  <span>
    Upload GST Certificate {!editingCompany && <b>*</b>}
  </span>

  {/* Show the existing GST certificate */}
  {editingCompany?.gst_certificate && (
    <div className="company-file-preview">
      {/\.(png|jpe?g|webp)(\?.*)?$/i.test(
        editingCompany.gst_certificate
      ) ? (
        <img
          src={getFileUrl(editingCompany.gst_certificate)}
          alt="Existing GST Certificate"
          className="company-preview-image"
          onError={(event) => {
            console.error(
              "GST certificate failed to load:",
              event.currentTarget.src
            );
          }}
        />
      ) : (
        <a
          href={getFileUrl(editingCompany.gst_certificate)}
          target="_blank"
          rel="noreferrer"
        >
          View existing GST certificate (PDF)
        </a>
      )}

      <small>Existing GST certificate</small>
    </div>
  )}

  <input
    type="file"
    accept="image/png,image/jpeg,image/webp,application/pdf"
    required={!editingCompany}
    onChange={(e) =>
      setFiles((current) => ({
        ...current,
        gstCertificate: e.target.files?.[0],
      }))
    }
  />

  {/* Preview the newly selected file */}
  {files.gstCertificate && (
    <div className="company-file-preview">
      {files.gstCertificate.type.startsWith("image/") ? (
        <img
          src={URL.createObjectURL(files.gstCertificate)}
          alt="New GST Certificate Preview"
          className="company-preview-image"
        />
      ) : (
        <span>{files.gstCertificate.name}</span>
      )}
      <small>New GST certificate</small>
    </div>
  )}

  <small>
    PDF, PNG, JPG or WEBP · Maximum 5 MB
    {editingCompany &&
      companyLabel(editingCompany.gst_certificate)}
  </small>
</label>

                    </div>

                    <div className="company-form-actions">
                        <button
                            type="button"
                            className="company-secondary-button"
                            disabled={saving}
                            onClick={closeForm}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="company-primary-button"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : editingCompany
                                    ? "Update Company"
                                    : "Submit"}
                        </button>
                    </div>
                </form>
            ) : (
                <section className="company-card">
                    <div className="company-list-toolbar">
                        <label className="company-entries">
                            Show
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                {[10, 25, 50, 100].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                            Entries
                        </label>

                        <label className="company-search">
                            Search:
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search companies..."
                            />
                        </label>
                    </div>

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
                                    companies.map((company, index) => (
                                        <tr key={company.id}>
                                            <td>{(page - 1) * limit + index + 1}</td>
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
                                                <span
                                                    className={`company-status ${company.status === "active"
                                                        ? "company-status-active"
                                                        : "company-status-inactive"
                                                        }`}
                                                >
                                                    {company.status || "inactive"}
                                                </span>
                                            </td>

                                            <td className="company-action-buttons">
                                                <button
                                                    type="button"
                                                    className="company-view-button"
                                                    onClick={() => openEditForm(company)}
                                                    title="Edit company"
                                                >
                                                    <i className="bi bi-pencil-square" />
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="company-delete-button"
                                                    disabled={deletingId !== null}
                                                    onClick={() => setCompanyToDelete(company)}
                                                    title="Delete company"
                                                >
                                                    <i className="bi bi-trash" />
                                                    {deletingId === company.id
                                                        ? "Deleting..."
                                                        : "Delete"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="company-table-footer">
                        <span>
                            Showing {firstEntry} to {lastEntry} of {total} entries
                        </span>

                        <div className="company-pagination">
                            <button
                                type="button"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage((current) => current - 1)}
                            >
                                Previous
                            </button>

                            <span>
                                Page {page} of {Math.max(totalPages, 1)}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    page >= totalPages || loading || totalPages === 0
                                }
                                onClick={() => setPage((current) => current + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>

            )}

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
        </div>
    );
}



function companyLabel(path: string | null | undefined): string {
    return path ? " · Existing document will be kept unless replaced." : "";
}

export default CompanyManagementPage;
