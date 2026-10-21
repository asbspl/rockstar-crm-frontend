
import { useCallback, useEffect, useMemo, useState } from "react";
import { Country, State, City } from "country-state-city";
import type {
    Employee,
    EmployeeForm,
    EmployeeStatus,
} from "../api/employees.api";
import {
    createEmployee,
    getEmployees,
    updateEmployee,
    updateEmployeeStatus,
    deleteEmployee,
} from "../api/employees.api";
import "./employee-management.css";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

const emptyForm: EmployeeForm = {
    employee_code: "",
    employee_name: "",
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    country: "India",
    state: "",
    city: "",
    pin_code: "",
    location: "",
    joining_date: "",
    resignation_date: "",
    status: "active",
    profile_picture: null,
    last_salary_slip: null,
    pan_card: null,
    aadhar_card: null,
    resume: null,
    account_statement: null,
    experience_certificate: null,
    allotment_list: null,
};

const locations = [
    "Wanowrie", "Lullanagar", "Kharadi", "Pimple Saudagar",
    "Phursungi", "Lohegaon", "Mundhwa", "Wakad", "Kothrud",
    "Pimpri", "Vimannagar", "Talegaon", "Parvati", "Hinjewadi Phase 3",
    "Chakan", "Rahatani", "Kiwale", "Sinhgad Road", "Ambegaon",
    "Camp", "Wagholi", "Wadgaon Sheri", "Hadapsar", "Ravet",
    "Dhanori", "Aundh", "Shivaji Nagar", "Kolhapur", "Vishrantwadi",
    "Dighi", "Moshi", "Budhwar Peth", "Dhankawadi",
    "Mohammadwadi", "Mumbai", "Satara", "Aurangabad", "Kondhwa",
    "Bhosari", "Punawale", "Balewadi", "Baner", "Katraj",
    "Chinchwad", "Alandi", "Bavdhan", "Yerwada", "Nashik",
    "Sangli", "Solapur", "Deccan Gymkhana", "Karvenagar",
    "Khadki", "Pashan", "Koregaon Park", "Kalyani Nagar",
].sort((a, b) => a.localeCompare(b));

const documents: {
    key: keyof EmployeeForm;
    label: string;
    accept: string;
}[] = [
        { key: "last_salary_slip", label: "Last Salary Slip", accept: ".pdf,.jpg,.jpeg,.png" },
        { key: "pan_card", label: "PAN Card", accept: ".pdf,.jpg,.jpeg,.png" },
        { key: "aadhar_card", label: "Aadhaar Card", accept: ".pdf,.jpg,.jpeg,.png" },
        { key: "resume", label: "Resume", accept: ".pdf,.doc,.docx" },
        { key: "account_statement", label: "Account Statement", accept: ".pdf,.jpg,.jpeg,.png" },
        { key: "experience_certificate", label: "Experience Certificate", accept: ".pdf,.jpg,.jpeg,.png" },
        { key: "allotment_list", label: "Allotment List", accept: ".pdf,.jpg,.jpeg,.png" },
    ];

export default function EmployeeManagementPage() {
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [form, setForm] = useState<EmployeeForm>({ ...emptyForm });
    const [notice, setNotice] = useState("");



    const API_ORIGIN = (
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
    ).replace(/\/api\/?$/, "");

    function getEmployeeFileUrl(path: string) {
        if (/^https?:\/\//i.test(path)) return path;

        return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
    }

    const countries = useMemo(() => Country.getAllCountries(), []);
    const selectedCountry = countries.find(
        (country) => country.name === form.country
    );
    const states = useMemo(
        () => State.getStatesOfCountry(selectedCountry?.isoCode || ""),
        [selectedCountry]
    );
    const selectedState = states.find((state) => state.name === form.state);
    const cities = useMemo(
        () =>
            City.getCitiesOfState(
                selectedCountry?.isoCode || "",
                selectedState?.isoCode || ""
            ),
        [selectedCountry, selectedState]
    );

    const loadEmployees = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getEmployees({
                page,
                limit,
                search: search.trim(),
                status: filterStatus,
            });

            setEmployees(result.employees);
            setTotal(result.pagination.total);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to load employees."
            );
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, filterStatus]);

    useEffect(() => {
        void loadEmployees();
    }, [loadEmployees]);

    function startCreate() {
        setEditing(null);
        setForm({ ...emptyForm });
        setNotice("");
        setShowForm(true);
    }

    function startEdit(employee: Employee) {
        setEditing(employee);

        setForm({
            ...emptyForm,
            employee_code: employee.employee_code || "",
            employee_name: employee.employee_name || "",
            phone: employee.phone || "",
            email: employee.email || "",
            address_line1: employee.address_line1 || "",
            address_line2: employee.address_line2 || "",
            country: employee.country || "",
            state: employee.state || "",
            city: employee.city || "",
            pin_code: employee.pin_code || "",
            location: employee.location || "",
            joining_date: employee.joining_date?.slice(0, 10) || "",
            resignation_date: employee.resignation_date?.slice(0, 10) || "",
            status: employee.status || "active",
        });

        setNotice("");
        setShowForm(true);
    }

    function changeField(
        field: keyof EmployeeForm,
        value: string | File | null
    ) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setNotice("");

        try {
            if (editing) {
                await updateEmployee(editing.id, form);
                setNotice("Employee updated successfully.");
            } else {
                await createEmployee(form);
                setNotice("Employee created successfully.");
            }

            setShowForm(false);
            setEditing(null);
            setForm({ ...emptyForm });
            await loadEmployees();
        } catch (err) {
            setNotice(
                err instanceof Error ? err.message : "Unable to save employee."
            );
        } finally {
            setSaving(false);
        }
    }


    async function handleDelete(employee: Employee) {
        setDeletingId(employee.id);
        setError("");
        setNotice("");

        try {
            await deleteEmployee(employee.id);

            // Close the confirmation dialog after successful deletion.
            setEmployeeToDelete(null);
            setNotice("Employee deleted successfully.");

            // If the last employee on this page was deleted, go back one page.
            if (employees.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadEmployees();
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete employee."
            );
        } finally {
            setDeletingId(null);
        }
    }


    async function toggleStatus(employee: Employee) {
        const nextStatus: EmployeeStatus =
            employee.status === "active" ? "inactive" : "active";

        if (!window.confirm(
            `Change ${employee.employee_name}'s status to ${nextStatus}?`
        )) return;

        try {
            await updateEmployeeStatus(employee.id, nextStatus);
            setNotice("Employee status updated successfully.");
            await loadEmployees();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to update status."
            );
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));

    function documentInput(
        key: keyof EmployeeForm,
        label: string,
        accept: string,
        required = false
    ) {
        const existingPath = editing
            ? (editing[key as keyof Employee] as string | null | undefined)
            : null;

        const fileUrl = existingPath
            ? getEmployeeFileUrl(existingPath)
            : "";

        const isImage = Boolean(
            existingPath && /\.(jpe?g|png|webp|gif)$/i.test(existingPath)
        );

        return (
            <div className="employee-field" key={key}>
                <label>
                    {label} {required && <span className="required">*</span>}
                </label>

                {existingPath && (
                    <div className="employee-existing-file">
                        {isImage && (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="employee-preview-link"
                            >
                                <img
                                    src={fileUrl}
                                    alt={label}
                                    className="employee-document-preview"
                                />
                            </a>
                        )}

                        <p>{existingPath.split("/").pop()}</p>

                        {/* <a href={fileUrl} target="_blank" rel="noreferrer">
                            View existing {label}
                        </a> */}
                    </div>
                )}

                <input
                    type="file"
                    accept={accept}
                    required={required && !existingPath}
                    onChange={(event) =>
                        changeField(key, event.target.files?.[0] || null)
                    }
                />

                {existingPath && (
                    <small>Choose a new file only if you want to replace the existing one.</small>
                )}
            </div>
        );
    }

    if (showForm) {
        return (
            <div className="employee-page">
                <div className="employee-heading">
                    <div>
                        <h1>{editing ? "Update Employee" : "Add Employee"}</h1>
                        <p>You can add or update employee information here.</p>
                    </div>
                    <ActionButton
                        action="cancel"
                        type="button"
                        onClick={() => setShowForm(false)}
                    >
                        Back to Employee List
                    </ActionButton>
                </div>

                {notice && <div className="employee-notice">{notice}</div>}

                <form className="employee-card" onSubmit={handleSubmit}>
                    <h2>Employee Details</h2>

                    <div className="employee-form-grid">
                        <div className="employee-field">
                            <label>Employee Name *</label>
                            <input required value={form.employee_name}
                                onChange={(e) => changeField("employee_name", e.target.value)} />
                        </div>
                        <div className="employee-field">
                            <label>Employee ID *</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. 1141"
                                value={form.employee_code}
                                onChange={(e) =>
                                    changeField("employee_code", e.target.value.toUpperCase())
                                }
                            />
                        </div>
                        <div className="employee-field">
                            <label>Employee Phone No *</label>
                            <input required type="tel" value={form.phone}
                                onChange={(e) => changeField("phone", e.target.value)} />
                        </div>
                        <div className="employee-field">
                            <label>Employee Email ID *</label>
                            <input required type="email" value={form.email}
                                onChange={(e) => changeField("email", e.target.value)} />
                        </div>
                        <div className="employee-field">
                            <label>Employee Address / Line-1 *</label>
                            <input required value={form.address_line1}
                                onChange={(e) => changeField("address_line1", e.target.value)} />
                        </div>
                        <div className="employee-field">
                            <label>Line-2</label>
                            <input value={form.address_line2}
                                onChange={(e) => changeField("address_line2", e.target.value)} />
                        </div>
                        <div className="employee-field">
                            <label>Country *</label>
                            <select required value={form.country}
                                onChange={(e) => {
                                    changeField("country", e.target.value);
                                    changeField("state", "");
                                    changeField("city", "");
                                }}>
                                <option value="">Select Country</option>
                                {countries.map((country) => (
                                    <option key={country.isoCode} value={country.name}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="employee-field">
                            <label>State *</label>
                            <select required value={form.state}
                                onChange={(e) => {
                                    changeField("state", e.target.value);
                                    changeField("city", "");
                                }}>
                                <option value="">Select State</option>
                                {states.map((state) => (
                                    <option key={state.isoCode} value={state.name}>
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="employee-field">
                            <label>City *</label>
                            <select required value={form.city}
                                onChange={(e) => changeField("city", e.target.value)}>
                                <option value="">Select City</option>
                                {cities.map((city, index) => (
                                    <option key={`${city.name}-${index}`} value={city.name}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="employee-field">
                            <label>Pin Code *</label>
                            <input required value={form.pin_code}
                                onChange={(e) => changeField("pin_code", e.target.value)} />
                        </div>
                        <div className="employee-field">
                            <label>Location *</label>
                            <select required value={form.location}
                                onChange={(e) => changeField("location", e.target.value)}>
                                <option value="">Select Location</option>
                                {locations.map((location) => (
                                    <option key={location} value={location}>{location}</option>
                                ))}
                            </select>
                            <small>
                                Add Location through your existing Location module.
                            </small>
                        </div>
                        <div className="employee-field">
                            <label>Employee Joining Date *</label>
                            <input required type="date" value={form.joining_date}
                                onChange={(e) => changeField("joining_date", e.target.value)} />
                        </div>
                        <div className="employee-field">
                            <label>Employee Resignation Date</label>
                            <input type="date" value={form.resignation_date}
                                min={form.joining_date || undefined}
                                onChange={(e) => changeField("resignation_date", e.target.value)} />
                        </div>
                        <div className="employee-field">
                            <label>Employee Status *</label>
                            <select required value={form.status}
                                onChange={(e) => changeField(
                                    "status", e.target.value as EmployeeStatus
                                )}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="resign">Resign</option>
                            </select>
                        </div>
                        {documentInput(
                            "profile_picture",
                            "Profile Picture",
                            ".jpg,.jpeg,.png,.webp",
                            false
                        )}
                    </div>

                    <h2 className="employee-section-heading">KYC Documents</h2>
                    <div className="employee-form-grid">
                        {documents.map((doc) =>
                            documentInput(
                                doc.key,
                                doc.label,
                                doc.accept,
                                !editing &&
                                ![
                                    "last_salary_slip",
                                    "experience_certificate",
                                    "allotment_list",
                                ].includes(doc.key)
                            )
                        )}
                    </div>

                    {notice && <div className="employee-notice">{notice}</div>}

                    <div className="employee-form-actions">
                        <button className="employee-btn employee-btn-primary"
                            disabled={saving} type="submit">
                            {saving ? "Saving..." : editing ? "Update Employee" : "Save Employee"}
                        </button>
                        <button className="employee-btn employee-btn-light"
                            type="button" disabled={saving}
                            onClick={() => setShowForm(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="employee-page">
            <div className="employee-heading">
                <div>
                    <h1>Manage Employee</h1>
                    <p>Manage your employee records, documents and status.</p>
                </div>
                <ActionButton
                    action="add"
                    type="button"
                    onClick={startCreate}
                >
                    Add Employee
                </ActionButton>
            </div>

            {notice && <div className="employee-notice">{notice}</div>}
            {error && <div className="employee-error">{error}</div>}

            <div className="employee-card">
                <h2>Our Employee List</h2>

                <div className="employee-table-toolbar">
                    <label>
                        Show{" "}
                        <select value={limit} onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                        }}>
                            {[10, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>{" "}
                        entries
                    </label>

                    <div className="employee-toolbar-right">
                        <select value={filterStatus} onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setPage(1);
                        }}>
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="resign">Resign</option>
                        </select>
                        <label>
                            Search:{" "}
                            <input value={search} placeholder="Search employees..."
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }} />
                        </label>
                    </div>
                </div>

                <div className="employee-table-wrap">
                    <table className="employee-table">
                        <thead>
                            <tr>
                                <th>S/n</th><th>Emp ID</th><th>Profile Picture</th><th>Name</th><th>Phone</th>
                                <th>Email</th><th>Address</th><th>Location</th>
                                <th>Status</th><th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10}>Loading employees...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan={10}>No employees found.</td></tr>
                            ) : employees.map((employee, index) => (
                                <tr key={employee.id}>
                                    <td>{(page - 1) * limit + index + 1}</td>
                                    <td>{employee.employee_code || "-"}</td>
                                    <td>
                                        {employee.profile_picture ? (
                                            <a
                                                href={getEmployeeFileUrl(employee.profile_picture)}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="Open profile picture"
                                            >
                                                <img
                                                    src={getEmployeeFileUrl(employee.profile_picture)}
                                                    alt={`${employee.employee_name || "Employee"} profile`}
                                                    className="employee-list-avatar"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                    }}
                                                />
                                            </a>
                                        ) : (
                                            <div
                                                className="employee-default-avatar"
                                                title="No profile picture"
                                            >
                                                <i className="bi bi-person-fill" aria-hidden="true" />
                                            </div>
                                        )}
                                    </td>
                                    <td>{employee.employee_name || "-"}</td>
                                    <td>{employee.phone || "-"}</td>
                                    <td>{employee.email || "-"}</td>
                                    <td>
                                        <div className="employee-address-scroll">
                                            {[employee.address_line1, employee.address_line2]
                                                .filter(Boolean)
                                                .join(", ") || "-"}
                                        </div>
                                    </td>
                                    <td>{employee.location || "-"}</td>
                                    <td>
                                        <button
                                            type="button"
                                            title="Click to toggle Active/Inactive"
                                            className={`employee-status employee-status-${employee.status}`}
                                            disabled={employee.status === "resign"}
                                            onClick={() => void toggleStatus(employee)}
                                        >
                                            {employee.status === "active" ? "Active" :
                                                employee.status === "inactive" ? "Inactive" : "Resign"}
                                        </button>
                                    </td>

                                    <td>
                                        <div className="employee-action-buttons">
                                            <ActionButton
                                                action="edit"
                                                title="Edit employee"
                                                onClick={() => startEdit(employee)}
                                            />
                                            <ActionButton
                                                action="delete"
                                                type="button"
                                                disabled={deletingId !== null}
                                                onClick={() => setEmployeeToDelete(employee)}
                                                title="Delete employee"
                                            >
                                                {deletingId === employee.id ? "Deleting..." : "Delete"}
                                            </ActionButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                </div>

                <div className="employee-pagination">
                    <span>
                        Showing {total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
                        {Math.min(page * limit, total)} of {total} entries
                    </span>
                    <div>
                        <button disabled={page <= 1 || loading}
                            onClick={() => setPage((p) => p - 1)}>Previous</button>
                        <span> Page {page} of {totalPages} </span>
                        <button disabled={page >= totalPages || loading}
                            onClick={() => setPage((p) => p + 1)}>Next</button>
                    </div>
                </div>
                <ConfirmDialog
                    open={employeeToDelete !== null}
                    title="Delete Employee?"
                    message="Are you sure you want to delete this employee?"
                    itemName={
                        employeeToDelete?.employee_name ||
                        employeeToDelete?.employee_code ||
                        "this employee"
                    }
                    confirmText="Delete Employee"
                    loading={deletingId !== null}
                    onCancel={() => {
                        if (deletingId === null) {
                            setEmployeeToDelete(null);
                        }
                    }}
                    onConfirm={() => {
                        if (employeeToDelete && deletingId === null) {
                            void handleDelete(employeeToDelete);
                        }
                    }}
                />
            </div>
        </div>
    );
}