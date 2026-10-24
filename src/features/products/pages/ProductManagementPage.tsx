import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

import apiClient from "../../../api/client";
import "./ProductManagementPage.css";

import ManagementLayout from "../../../components/common/ManagementLayout/ManagementLayout";
import ActionButton from "../../../components/common/ActionButton/ActionButton";
import ConfirmDialog from "../../../components/common/ConfirmDialog/ConfirmDialog";

import {
    createProduct,
    deleteProduct,
    getProduct,
    getProducts,
    updateProduct,
    updateProductStatus,
    type Product,
    type ProductInput,
    type ProductStatus,
} from "../api/products.api";

type Mode = "create" | "edit";

const statuses: ProductStatus[] = ["Active", "Inactive"];

const emptyForm: ProductInput = {
    product_code: "",
    product_name: "",
    unit: "",
    product_description: "",
    hsn_code: "",
    standard_rate: 0,
    product_image: null,
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

function getProductImageUrl(
    imagePath?: string | null
): string {
    if (!imagePath?.trim()) return "";

    const value = imagePath.trim();

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    const configuredBase = (
        import.meta.env.VITE_API_BASE_URL ||
        "http://localhost:3000"
    )
        .replace(/\/+$/, "")
        .replace(/\/api$/i, "");

    return `${configuredBase}/${value.replace(/^\/+/, "")}`;
}

function formatRate(rate: number | string): string {
    const value = Number(rate);

    return Number.isFinite(value)
        ? value.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : "0.00";
}

export default function ProductManagementPage() {
    const [products, setProducts] = useState<Product[]>([]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
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
    const [existing, setExisting] = useState<Product | null>(
        null
    );
    const [form, setForm] = useState<ProductInput>({
        ...emptyForm,
    });

    const [productToDelete, setProductToDelete] =
        useState<Product | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(
        null
    );

    const [productToChangeStatus, setProductToChangeStatus] =
        useState<Product | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<
        number | null
    >(null);

    const selectedImagePreview = useMemo(() => {
        if (!form.product_image) return "";

        return URL.createObjectURL(form.product_image);
    }, [form.product_image]);

    useEffect(() => {
        return () => {
            if (selectedImagePreview) {
                URL.revokeObjectURL(selectedImagePreview);
            }
        };
    }, [selectedImagePreview]);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getProducts({
                page,
                limit,
                search,
                status: statusFilter,
            });

            setProducts(result.data ?? []);
            setTotal(result.pagination?.total ?? 0);
            setTotalPages(
                Math.max(1, result.pagination?.totalPages ?? 1)
            );
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to load products. Please try again."
                )
            );
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, statusFilter]);

    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);

    function setField<K extends keyof ProductInput>(
        key: K,
        value: ProductInput[K]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function closeForm() {
        setMode(null);
        setSelectedId(null);
        setExisting(null);
        setForm({ ...emptyForm });
        setError("");
        setNotice("");
    }

    async function openForm(
        nextMode: Mode,
        product?: Product
    ) {
        setError("");
        setNotice("");
        setExisting(null);
        setSelectedId(product ? Number(product.id) : null);
        setForm({ ...emptyForm });

        if (nextMode === "create" || !product) {
            setMode("create");
            return;
        }

        try {
            const full = await getProduct(Number(product.id));

            setExisting(full);
            setForm({
                product_code: full.product_code ?? "",
                product_name: full.product_name ?? "",
                unit: full.unit ?? "",
                product_description:
                    full.product_description ?? "",
                hsn_code: full.hsn_code ?? "",
                standard_rate: Number(full.standard_rate ?? 0),
                product_image: null,
            });

            setMode("edit");
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to load product details."
                )
            );
        }
    }

    async function submit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!mode) return;

        setError("");
        setNotice("");

        const productCode = form.product_code.trim();
        const productName = form.product_name.trim();
        const unit = form.unit.trim();
        const description = form.product_description.trim();
        const hsnCode = form.hsn_code.trim();
        const rate = Number(form.standard_rate);

        if (!productCode) {
            setError("Product Code is required.");
            return;
        }

        if (!productName) {
            setError("Product Name is required.");
            return;
        }

        if (!unit) {
            setError("Unit is required.");
            return;
        }

        if (!description) {
            setError("Product Description is required.");
            return;
        }

        if (!hsnCode) {
            setError("HSN Code is required.");
            return;
        }

        if (!Number.isFinite(rate) || rate < 0) {
            setError(
                "Standard Rate must be a valid non-negative number."
            );
            return;
        }

        if (
            mode === "create" &&
            !form.product_image
        ) {
            setError("Please upload a Product Image.");
            return;
        }

        if (
            mode === "edit" &&
            !form.product_image &&
            !existing?.product_image
        ) {
            setError("Please upload a Product Image.");
            return;
        }

        const payload: ProductInput = {
            product_code: productCode,
            product_name: productName,
            unit,
            product_description: description,
            hsn_code: hsnCode,
            standard_rate: rate,
            product_image: form.product_image,
        };

        setSaving(true);

        try {
            if (mode === "create") {
                await createProduct(payload);
            } else if (selectedId !== null) {
                await updateProduct(selectedId, payload);
            } else {
                throw new Error(
                    "No product selected for updating."
                );
            }

            const message =
                mode === "create"
                    ? "Product added successfully."
                    : "Product updated successfully.";

            closeForm();
            await loadProducts();
            setNotice(message);
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to save product.")
            );
        } finally {
            setSaving(false);
        }
    }

    function requestStatusChange(product: Product) {
        setError("");
        setNotice("");
        setProductToChangeStatus(product);
    }

    async function confirmStatusChange() {
        if (!productToChangeStatus) return;

        const product = productToChangeStatus;

        const nextStatus: ProductStatus =
            product.status === "Active" ? "Inactive" : "Active";

        setUpdatingStatusId(Number(product.id));
        setError("");

        try {
            await updateProductStatus(
                Number(product.id),
                nextStatus
            );

            setProductToChangeStatus(null);
            await loadProducts();

            setNotice(
                `${product.product_name} status changed to ${nextStatus}.`
            );
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Unable to update product status."
                )
            );
        } finally {
            setUpdatingStatusId(null);
        }
    }

    async function removeProduct(product: Product) {
        setDeletingId(Number(product.id));
        setError("");

        try {
            await deleteProduct(Number(product.id));

            setProductToDelete(null);

            if (products.length === 1 && page > 1) {
                setPage((current) => current - 1);
            } else {
                await loadProducts();
            }

            setNotice("Product deleted successfully.");
        } catch (err) {
            setError(
                getErrorMessage(err, "Unable to delete product.")
            );
        } finally {
            setDeletingId(null);
        }
    }

    const startIndex = (page - 1) * limit;

    const alert = error ? (
        <div
            className="product-alert product-alert--error"
            role="alert"
        >
            {error}
        </div>
    ) : notice ? (
        <div
            className="product-alert product-alert--success"
            role="status"
        >
            {notice}
        </div>
    ) : null;

    return (
        <ManagementLayout
            title="Manage Product"
            description="Manage product codes, descriptions, units, HSN codes, rates and images."
            showForm={mode !== null}
            listTitle="Our Product List"
            addButtonText="Add Product"
            onAdd={() => void openForm("create")}
            onBack={closeForm}
            formTitle={
                mode === "create"
                    ? "Add New Product"
                    : "Update Product"
            }
            error={alert}
            toolbar={
                mode === null ? (
                    <>
                        <div className="management-page__toolbar-group">
                            <label htmlFor="product-limit">
                                Show
                            </label>

                            <select
                                id="product-limit"
                                value={limit}
                                onChange={(event) => {
                                    setLimit(
                                        Number(event.target.value)
                                    );
                                    setPage(1);
                                }}
                            >
                                {[10, 25, 50, 100].map((number) => (
                                    <option
                                        key={number}
                                        value={number}
                                    >
                                        {number}
                                    </option>
                                ))}
                            </select>

                            <span>entries</span>
                        </div>

                        <div className="management-page__toolbar-group">
                            <select
                                aria-label="Filter by product status"
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(
                                        event.target.value
                                    );
                                    setPage(1);
                                }}
                            >
                                <option value="All">
                                    All Statuses
                                </option>

                                {statuses.map((status) => (
                                    <option
                                        key={status}
                                        value={status}
                                    >
                                        {status}
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="product-search">
                                Search:
                            </label>

                            <input
                                id="product-search"
                                type="search"
                                value={search}
                                placeholder="Search products..."
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
                            {Math.min(
                                startIndex + products.length,
                                total
                            )}{" "}
                            of {total} entries
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
                                disabled={
                                    page >= totalPages || loading
                                }
                                onClick={() =>
                                    setPage((current) => current + 1)
                                }
                            >
                                Next
                            </button>
                        </div>
                    </>
                ) : null
            }
        >
            {mode === null ? (
                <div className="product-table-wrapper">
                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                <th>Product Code</th>
                                <th>Product Name</th>
                                <th>Unit</th>
                                <th>HSN Code</th>
                                <th>Standard Rate ₹.</th>
                                <th>Status</th>
                                <th>Product Image</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="product-table-message"
                                    >
                                        Loading products...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="product-table-message"
                                    >
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product, index) => (
                                    <tr key={product.id}>
                                        <td>
                                            {startIndex + index + 1}
                                        </td>

                                        <td className="product-code-cell">
                                            {product.product_code || "—"}
                                        </td>

                                        <td className="product-name-cell">
                                            {product.product_name || "—"}
                                        </td>

                                        <td>{product.unit || "—"}</td>
                                        <td>{product.hsn_code || "—"}</td>

                                        <td className="product-rate-cell">
                                            {formatRate(
                                                product.standard_rate
                                            )}
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className={`product-status product-status--${String(
                                                    product.status || "active"
                                                ).toLowerCase()}`}
                                                disabled={
                                                    updatingStatusId !==
                                                    null
                                                }
                                                title="Click to change product status"
                                                onClick={() =>
                                                    requestStatusChange(
                                                        product
                                                    )
                                                }
                                            >
                                                {updatingStatusId ===
                                                Number(product.id)
                                                    ? "Updating..."
                                                    : product.status}
                                            </button>
                                        </td>

                                        <td>
                                            {product.product_image ? (
                                                <a
                                                    href={getProductImageUrl(
                                                        product.product_image
                                                    )}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="product-image-link"
                                                    title="View full product image"
                                                >
                                                    <img
                                                        className="product-thumbnail"
                                                        src={getProductImageUrl(
                                                            product.product_image
                                                        )}
                                                        alt={product.product_name}
                                                        loading="lazy"
                                                    />
                                                </a>
                                            ) : (
                                                <span>—</span>
                                            )}
                                        </td>

                                        <td>
                                            <div className="product-actions">
                                                <ActionButton
                                                    action="edit"
                                                    type="button"
                                                    title="Edit product"
                                                    onClick={() =>
                                                        void openForm(
                                                            "edit",
                                                            product
                                                        )
                                                    }
                                                />

                                                <ActionButton
                                                    action="delete"
                                                    type="button"
                                                    title="Delete product"
                                                    disabled={
                                                        deletingId !== null
                                                    }
                                                    onClick={() =>
                                                        setProductToDelete(
                                                            product
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
                    className="product-form"
                    onSubmit={submit}
                >
                    <fieldset
                        className="product-fieldset"
                        disabled={saving}
                    >
                        <legend>Product Information</legend>

                        <p className="product-form-intro">
                            You can add a new Product from here.
                        </p>

                        <div className="product-form-grid">
                            <label className="product-form-field">
                                <span>Product Code *</span>
                                <input
                                    required
                                    maxLength={50}
                                    value={form.product_code}
                                    placeholder="e.g. PROD52846"
                                    onChange={(event) =>
                                        setField(
                                            "product_code",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="product-form-field">
                                <span>Product Name *</span>
                                <input
                                    required
                                    maxLength={200}
                                    value={form.product_name}
                                    placeholder="Enter product name"
                                    onChange={(event) =>
                                        setField(
                                            "product_name",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="product-form-field">
                                <span>Unit *</span>
                                <input
                                    required
                                    maxLength={50}
                                    value={form.unit}
                                    placeholder="e.g. Bag, Kg, Litre, Piece"
                                    onChange={(event) =>
                                        setField(
                                            "unit",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="product-form-field">
                                <span>HSN Code *</span>
                                <input
                                    required
                                    maxLength={30}
                                    value={form.hsn_code}
                                    placeholder="e.g. 382450"
                                    onChange={(event) =>
                                        setField(
                                            "hsn_code",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="product-form-field product-form-field--full">
                                <span>Product Description *</span>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.product_description}
                                    placeholder="Enter product description"
                                    onChange={(event) =>
                                        setField(
                                            "product_description",
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="product-form-field">
                                <span>Standard Rate ₹ *</span>
                                <input
                                    required
                                    type="number"
                                    min={0}
                                    max={9999999999.99}
                                    step="0.01"
                                    value={form.standard_rate}
                                    onChange={(event) =>
                                        setField(
                                            "standard_rate",
                                            event.target.value === ""
                                                ? 0
                                                : Number(
                                                      event.target.value
                                                  )
                                        )
                                    }
                                />
                            </label>

                            <label className="product-form-field">
                                <span>Product Image *</span>

                                {existing?.product_image && (
                                    <a
                                        href={getProductImageUrl(
                                            existing.product_image
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="product-existing-image-link"
                                    >
                                        View existing product image
                                    </a>
                                )}

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                                    required={
                                        mode === "create" ||
                                        !existing?.product_image
                                    }
                                    onChange={(event) =>
                                        setField(
                                            "product_image",
                                            event.target.files?.[0] ?? null
                                        )
                                    }
                                />

                                <small>
                                    JPG, JPEG, PNG, WEBP or GIF;
                                    maximum 5 MB.
                                </small>
                            </label>

                            {(selectedImagePreview ||
                                existing?.product_image) && (
                                <div className="product-image-preview-field">
                                    <span>Image Preview</span>

                                    <img
                                        className="product-image-preview"
                                        src={
                                            selectedImagePreview ||
                                            getProductImageUrl(
                                                existing?.product_image
                                            )
                                        }
                                        alt="Product preview"
                                    />

                                    {form.product_image && (
                                        <small>
                                            The new image will replace
                                            the saved image after the
                                            update succeeds.
                                        </small>
                                    )}
                                </div>
                            )}
                        </div>
                    </fieldset>

                    <footer className="product-form-footer">
                        <button
                            type="submit"
                            className="product-primary-button"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : mode === "create"
                                  ? "Save Product"
                                  : "Update Product"}
                        </button>

                        <button
                            type="button"
                            className="product-secondary-button"
                            disabled={saving}
                            onClick={closeForm}
                        >
                            Cancel
                        </button>
                    </footer>
                </form>
            )}

            <ConfirmDialog
                open={productToChangeStatus !== null}
                title="Change Product Status?"
                message={
                    productToChangeStatus
                        ? `Change ${productToChangeStatus.product_name}'s status from ${productToChangeStatus.status} to ${
                              productToChangeStatus.status === "Active"
                                  ? "Inactive"
                                  : "Active"
                          }?`
                        : ""
                }
                itemName={
                    productToChangeStatus?.product_name ||
                    "this product"
                }
                confirmText="Confirm"
                loading={updatingStatusId !== null}
                onCancel={() => {
                    if (updatingStatusId === null) {
                        setProductToChangeStatus(null);
                    }
                }}
                onConfirm={() => void confirmStatusChange()}
            />

            <ConfirmDialog
                open={productToDelete !== null}
                title="Delete Product?"
                message={
                    productToDelete
                        ? `Are you sure you want to delete ${productToDelete.product_name}?`
                        : ""
                }
                itemName={
                    productToDelete?.product_name ||
                    "this product"
                }
                confirmText="Delete"
                loading={deletingId !== null}
                onCancel={() => {
                    if (deletingId === null) {
                        setProductToDelete(null);
                    }
                }}
                onConfirm={() => {
                    if (productToDelete) {
                        void removeProduct(productToDelete);
                    }
                }}
            />
        </ManagementLayout>
    );
}