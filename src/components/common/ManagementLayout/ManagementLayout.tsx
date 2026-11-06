
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "../../../contexts/useAuthContext";
import { getModulePermission, type ModuleAction } from "../../../config/permissions";
import "./ManagementLayout.css";

interface MobileTableDetail {
    title: string;
    fields: Array<{ label: string; value: string }>;
}

interface ManagementLayoutProps {
    title: string;
    description: string;
    showForm: boolean;
    listTitle: string;
    addButtonText: string;
    onAdd: () => void;
    onBack: () => void;
    formTitle: string;
    formAction?: Extract<ModuleAction, "create" | "update">;
    children: ReactNode;
    toolbar?: ReactNode;
    pagination?: ReactNode;
    notice?: ReactNode;
    error?: ReactNode;
}

export default function ManagementLayout({
    title,
    description,
    showForm,
    listTitle,
    addButtonText,
    onAdd,
    onBack,
    formTitle,
    formAction,
    children,
    toolbar,
    pagination,
    notice,
    error,
}: ManagementLayoutProps) {

    const { pathname } = useLocation();
    const { hasPermission } = useAuthContext();
    const createPermission = getModulePermission(pathname, "create");
    const formPermission = formAction
        ? getModulePermission(pathname, formAction)
        : undefined;
    const canAdd = Boolean(createPermission && hasPermission(createPermission));
    const canShowForm = Boolean(formAction && formPermission && hasPermission(formPermission));

    const tableWrapperRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const mobileDetailsTriggerRef = useRef<HTMLButtonElement | null>(null);
    const mobileDetailsCloseRef = useRef<HTMLButtonElement>(null);
    const [mobileTableDetail, setMobileTableDetail] =
        useState<MobileTableDetail | null>(null);

    useEffect(() => {
        if (!mobileTableDetail) return;

        const trigger = mobileDetailsTriggerRef.current;
        mobileDetailsCloseRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMobileTableDetail(null);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            trigger?.focus();
            mobileDetailsTriggerRef.current = null;
        };
    }, [mobileTableDetail]);

    useEffect(() => {
        const toolbarElement = toolbarRef.current;
        if (!toolbarElement) return;

        toolbarElement.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
            const label = [
                select.getAttribute("aria-label"),
                select.labels?.[0]?.textContent,
                select.id,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            const isPageSize =
                /entries|page size|limit/.test(label) ||
                Boolean(select.id && /limit/i.test(select.id));

            select.dataset.mobileToolbarIcon = isPageSize ? "entries" : "filter";
            if (!select.title) {
                select.title =
                    (isPageSize ? "Entries per page" : null) ??
                    select.getAttribute("aria-label") ??
                    select.labels?.[0]?.textContent?.trim() ??
                    "Filter";
            }
            if (!select.hasAttribute("aria-label")) {
                select.setAttribute("aria-label", select.title);
            }
        });

        toolbarElement.querySelectorAll<HTMLInputElement>(
            'input[type="search"], input:not([type])',
        ).forEach((input) => {
            input.dataset.mobileToolbarIcon = "search";
            if (!input.title) {
                input.title =
                    input.getAttribute("aria-label") ??
                    input.placeholder ??
                    "Search";
            }
            if (
                !input.hasAttribute("aria-label") &&
                !input.labels?.length
            ) {
                input.setAttribute("aria-label", input.title);
            }
        });

        toolbarElement.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
            const label = (
                button.getAttribute("aria-label") ??
                button.title ??
                button.textContent ??
                ""
            )
                .trim()
                .toLowerCase();
            const icon = /search/.test(label)
                ? "bi-search"
                : /filter/.test(label)
                  ? "bi-funnel"
                  : /refresh|reload/.test(label)
                    ? "bi-arrow-clockwise"
                    : /clear|reset/.test(label)
                      ? "bi-x-lg"
                      : /export|download/.test(label)
                        ? "bi-download"
                        : "bi-three-dots";

            button.dataset.mobileToolbarIcon = icon;
            if (!button.title && label) button.title = button.textContent?.trim() ?? "";
            if (!button.hasAttribute("aria-label") && button.title) {
                button.setAttribute("aria-label", button.title);
            }
            if (!button.querySelector("i, svg")) {
                const buttonIcon = document.createElement("i");
                buttonIcon.className = `bi ${icon}`;
                buttonIcon.setAttribute("aria-hidden", "true");
                button.appendChild(buttonIcon);
            }
        });
    }, [toolbar]);

    useEffect(() => {
        const wrapper = tableWrapperRef.current;

        if (!wrapper || showForm) return;

        // Add sorting arrows to all table headers.
        const addSortingArrows = () => {
            const headers = wrapper.querySelectorAll<HTMLTableCellElement>(
                "table thead th, table tr:first-child th"
            );

            headers.forEach((th) => {
                if (th.querySelector(".table-sort-arrows")) return;

                th.classList.add("table-sortable");

                const arrows = document.createElement("span");
                arrows.className = "table-sort-arrows";

                const ascending = document.createElement("span");
                ascending.className = "table-sort-up";
                ascending.textContent = "↑";

                const descending = document.createElement("span");
                descending.className = "table-sort-down";
                descending.textContent = "↓";

                arrows.appendChild(ascending);
                arrows.appendChild(descending);

                th.appendChild(arrows);
            });
        };

        const normalizeMobileHeader = (value: string) =>
            value.toLowerCase().replace(/[^a-z0-9]/g, "");

        const getMobileTableConfig = (headers: string[]) => {
            const normalized = headers.map(normalizeMobileHeader);
            const findColumn = (aliases: string[]) => {
                for (const alias of aliases) {
                    const index = normalized.findIndex(
                        (header) => header === alias || header.includes(alias),
                    );
                    if (index >= 0) return index;
                }
                return -1;
            };
            const hasColumn = (aliases: string[]) => findColumn(aliases) >= 0;

            const quotationTable = hasColumn([
                "quotationnumber",
                "quotationno",
                "quoteno",
                "qtno",
            ]);
            const orderTable = hasColumn([
                "ordernumber",
                "orderno",
                "orderid",
                "dcsno",
                "pino",
            ]);
            const employeeTable = hasColumn([
                "employeenumber",
                "employeeid",
                "empid",
                "empno",
            ]);
            const driverTable =
                hasColumn(["driverfullname", "drivername"]) ||
                hasColumn(["vehiclenumber", "vehicle no", "vehicleno"]);
            const rateMatrixTable =
                hasColumn(["customername", "customer"]) &&
                hasColumn(["product", "productname"]) &&
                hasColumn(["rate"]);
            const siteTable = normalized.includes("site");

            let primaryIndex = -1;
            if (rateMatrixTable || quotationTable || orderTable) {
                primaryIndex = orderTable
                    ? findColumn(["clientname", "client"])
                    : findColumn(["customername", "customer"]);
                if (primaryIndex < 0 && (rateMatrixTable || quotationTable || orderTable)) {
                    primaryIndex = findColumn(["customername", "customer"]);
                }
            } else if (driverTable) {
                primaryIndex = findColumn(["driverfullname", "drivername"]);
            } else if (siteTable) {
                primaryIndex = findColumn(["sitename", "site"]);
            } else if (hasColumn(["productname"])) {
                primaryIndex = findColumn(["productname"]);
            }
            if (primaryIndex < 0) {
                primaryIndex = findColumn([
                    "customername",
                    "driverfullname",
                    "drivername",
                    "companyname",
                    "employeename",
                    "contractorname",
                    "clientname",
                    "sitename",
                    "site",
                    "locationname",
                    "productname",
                    "name",
                    "customer",
                    "location",
                ]);
            }

            let secondaryFields: Array<{ aliases: string[]; label: string }>;
            if (driverTable) {
                secondaryFields = [
                    { aliases: ["vehiclenumber", "vehicleno"], label: "Vehicle Number" },
                    { aliases: ["vehicletype"], label: "Vehicle Type" },
                ];
            } else if (employeeTable) {
                secondaryFields = [
                    {
                        aliases: ["employeenumber", "employeeid", "empid", "empno"],
                        label: "Employee Number",
                    },
                    { aliases: ["emailaddress", "emailid", "email"], label: "Email" },
                ];
            } else if (quotationTable) {
                secondaryFields = [
                    {
                        aliases: ["customersitename", "customersite", "sitelocation", "location"],
                        label: "Customer Site",
                    },
                    { aliases: ["amount", "amt"], label: "Amount" },
                ];
            } else if (orderTable) {
                secondaryFields = [
                    {
                        aliases: ["customersitename", "customersite", "sitelocation"],
                        label: "Customer Site Name",
                    },
                    { aliases: ["location"], label: "Location" },
                ];
            } else if (rateMatrixTable) {
                secondaryFields = [
                    { aliases: ["productname", "product"], label: "Product" },
                    { aliases: ["rate"], label: "Rate" },
                ];
            } else if (hasColumn(["productname"])) {
                secondaryFields = [
                    { aliases: ["standardrate"], label: "Standard Rate" },
                ];
            } else if (siteTable) {
                secondaryFields = [
                    { aliases: ["customername", "customer"], label: "Customer" },
                    { aliases: ["location"], label: "Location" },
                ];
            } else if (hasColumn(["customername"])) {
                secondaryFields = [
                    { aliases: ["address"], label: "Address" },
                    { aliases: ["location"], label: "Location" },
                ];
            } else if (hasColumn(["code"])) {
                secondaryFields = [
                    { aliases: ["address"], label: "Address" },
                    { aliases: ["location"], label: "Location" },
                ];
            } else {
                secondaryFields = [{ aliases: ["address"], label: "Address" }];
            }

            const statusIndex = findColumn(["status", "active"]);
            const actionIndex = findColumn(["actions", "action"]);
            const secondaryIndexes = secondaryFields
                .map(({ aliases, label }) => ({
                    index: findColumn(aliases),
                    label,
                }))
                .filter(
                    (field, position, fields) =>
                        field.index >= 0 &&
                        field.index !== primaryIndex &&
                        field.index !== statusIndex &&
                        field.index !== actionIndex &&
                        fields.findIndex((candidate) => candidate.index === field.index) ===
                            position,
                );

            return { primaryIndex, secondaryIndexes, statusIndex, actionIndex };
        };

        const decorateMobileTables = () => {
            wrapper.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
                if (table.parentElement && table.parentElement !== wrapper) {
                    table.parentElement.dataset.mobileTableContainer = "true";
                }

                const headerRow =
                    table.tHead?.rows[table.tHead.rows.length - 1] ??
                    table
                        .querySelector<HTMLTableCellElement>("tr th")
                        ?.closest<HTMLTableRowElement>("tr");
                if (!headerRow) return;

                const headers = Array.from(headerRow.cells);
                const labels = headers.map((header) =>
                    (header.textContent ?? "").replace(/[↑↓]/g, "").trim(),
                );
                const {
                    primaryIndex,
                    secondaryIndexes,
                    statusIndex,
                    actionIndex,
                } = getMobileTableConfig(labels);
                const fallbackPrimaryIndex = labels.findIndex(
                    (label) =>
                        !/^(s\/?n|no\.?|#|id|status|actions?)$/i.test(label),
                );
                const selectedPrimaryIndex =
                    primaryIndex >= 0 ? primaryIndex : fallbackPrimaryIndex;
                const secondaryLabelByIndex = new Map(
                    secondaryIndexes.map(({ index, label }) => [index, label]),
                );

                table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
                    if (row.querySelector("th, td[colspan]")) return;

                    const cells = Array.from(row.cells);
                    let rowActionIndex = actionIndex;
                    if (
                        rowActionIndex < 0 ||
                        !cells[rowActionIndex]?.querySelector("button, a")
                    ) {
                        rowActionIndex = cells.findIndex((cell) =>
                            Boolean(cell.querySelector("button, a")),
                        );
                    }

                    cells.forEach((cell, index) => {
                        cell.dataset.mobileLabel =
                            secondaryLabelByIndex.get(index) ??
                            labels[index] ??
                            `Field ${index + 1}`;
                        delete cell.dataset.mobilePriority;

                        if (index === selectedPrimaryIndex) {
                            cell.dataset.mobilePriority = "primary";
                        } else if (index === statusIndex) {
                            cell.dataset.mobilePriority = "status";
                            const statusText = (cell.textContent ?? "").trim();
                            cell.dataset.mobileStatus =
                                /inactive|disabled|rejected|declined|cancelled|failed/i.test(statusText)
                                    ? "negative"
                                    : /pending|review|draft|hold/i.test(statusText)
                                      ? "pending"
                                      : /active|approved|success|complete|dispatched/i.test(statusText)
                                        ? "positive"
                                        : "neutral";
                        } else if (index === rowActionIndex) {
                            cell.dataset.mobilePriority = "actions";
                        } else if (secondaryLabelByIndex.has(index)) {
                            cell.dataset.mobilePriority = "secondary";
                        }
                    });

                    const primaryCell = cells[selectedPrimaryIndex];

                    const actionCell =
                        rowActionIndex >= 0
                            ? cells[rowActionIndex]
                            : cells.find((cell) => cell.querySelector("button, a"));

                    if (
                        primaryCell &&
                        actionCell &&
                        !actionCell.querySelector(".management-page__mobile-details")
                    ) {
                        const detailsButton = document.createElement("button");

                        detailsButton.type = "button";
                        detailsButton.className = "management-page__mobile-details";
                        detailsButton.setAttribute("aria-label", "View all details");
                        detailsButton.title = "View all details";

                        const detailsIcon = document.createElement("i");
                        detailsIcon.className = "bi bi-eye";
                        detailsIcon.setAttribute("aria-hidden", "true");

                        detailsButton.appendChild(detailsIcon);
                        actionCell.appendChild(detailsButton);
                    }
                });
            });
        };

        const handleMobileDetails = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const button = target.closest<HTMLButtonElement>(
                ".management-page__mobile-details",
            );
            const row = button?.closest("tr");
            if (!row) return;

            mobileDetailsTriggerRef.current = button;

            const fields = Array.from(
                row.querySelectorAll<HTMLTableCellElement>("td[data-mobile-label]"),
            )
                .filter((cell) => cell.dataset.mobilePriority !== "actions")
                .map((cell) => ({
                    label: cell.dataset.mobileLabel ?? "Details",
                    value: (cell.textContent ?? "").trim(),
                }))
                .filter((field) => field.value.length > 0);

            setMobileTableDetail({
                title:
                    fields.find((field) => /name|employee|customer|client|company|driver|user|applicant|product|site|location|contractor/i.test(field.label))
                        ?.value ??
                    fields[0]?.value ??
                    "Record details",
                fields,
            });
        };

        // Sort table rows.
        const sortTable = (th: HTMLTableCellElement) => {
            const table = th.closest("table");

            if (!table) return;

            const columnIndex = th.cellIndex;

            const currentDirection = th.dataset.sortDirection;

            const direction =
                currentDirection === "asc" ? "desc" : "asc";

            // Reset sorting arrows in this table.
            table.querySelectorAll<HTMLTableCellElement>(
                "thead th, tr:first-child th"
            ).forEach((header) => {
                header.dataset.sortDirection = "";

                header.querySelector(".table-sort-up")
                    ?.classList.remove("active");

                header.querySelector(".table-sort-down")
                    ?.classList.remove("active");

                header.removeAttribute("aria-sort");
            });

            // Activate selected sorting arrow.
            th.dataset.sortDirection = direction;

            th.setAttribute(
                "aria-sort",
                direction === "asc" ? "ascending" : "descending"
            );

            const activeArrow =
                direction === "asc"
                    ? ".table-sort-up"
                    : ".table-sort-down";

            th.querySelector(activeArrow)?.classList.add("active");

            const collator = new Intl.Collator(undefined, {
                numeric: true,
                sensitivity: "base",
            });

            // Sort each table body.
            Array.from(table.tBodies).forEach((tbody) => {
                const rows = Array.from(tbody.rows);

                rows.sort((rowA, rowB) => {
                    const valueA =
                        rowA.cells[columnIndex]?.textContent?.trim() ?? "";

                    const valueB =
                        rowB.cells[columnIndex]?.textContent?.trim() ?? "";

                    // Keep empty values at the bottom.
                    if (!valueA && !valueB) return 0;
                    if (!valueA) return 1;
                    if (!valueB) return -1;

                    let comparison = 0;

                    // Numeric comparison.
                    const cleanA = valueA.replace(/[₹$,\s]/g, "");
                    const cleanB = valueB.replace(/[₹$,\s]/g, "");

                    const isNumberA =
                        /^-?\d+(\.\d+)?$/.test(cleanA);

                    const isNumberB =
                        /^-?\d+(\.\d+)?$/.test(cleanB);

                    if (isNumberA && isNumberB) {
                        comparison =
                            Number(cleanA) - Number(cleanB);
                    }
                    // Date comparison.
                    else if (
                        /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(valueA) &&
                        /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(valueB)
                    ) {
                        const dateA = Date.parse(valueA);
                        const dateB = Date.parse(valueB);

                        comparison =
                            !Number.isNaN(dateA) &&
                            !Number.isNaN(dateB)
                                ? dateA - dateB
                                : collator.compare(valueA, valueB);
                    }
                    // Text comparison.
                    else {
                        comparison = collator.compare(valueA, valueB);
                    }

                    return direction === "asc"
                        ? comparison
                        : -comparison;
                });

                rows.forEach((row) => tbody.appendChild(row));
            });
        };

        // Handle clicks on every table header.
        const handleHeaderClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            const th = target.closest<HTMLTableCellElement>(
                "th.table-sortable"
            );

            if (!th || !wrapper.contains(th)) return;

            sortTable(th);
        };

        // Initial arrow creation.
        addSortingArrows();
        decorateMobileTables();

        wrapper.addEventListener("click", handleHeaderClick);
        wrapper.addEventListener("click", handleMobileDetails);

        // Support dynamically rendered tables and headers.
        const observer = new MutationObserver(() => {
            addSortingArrows();
            decorateMobileTables();
        });

        observer.observe(wrapper, {
            childList: true,
            subtree: true,
        });

        return () => {
            wrapper.removeEventListener("click", handleHeaderClick);
            wrapper.removeEventListener("click", handleMobileDetails);
            observer.disconnect();
        };

    }, [showForm, children]);

    return (
        <section className="management-page">

            {/* Shared page header */}
            <header className="management-page__header">
                <div className="management-page__heading">
                    <h1>{title}</h1>
                    <p>{description}</p>
                </div>

                <div className="management-page__header-actions">
                    {showForm ? <button
                        type="button"
                        className="management-page__back-button"
                        onClick={onBack}
                    >
                        Back to List
                    </button> : canAdd ? <button
                        type="button"
                        className="management-page__add-button"
                        onClick={onAdd}
                    >
                        <span aria-hidden="true">＋</span>
                        {addButtonText}
                    </button> : null}
                </div>
            </header>

            {error && (
                <div className="management-page__message">
                    {error}
                </div>
            )}

            {notice && (
                <div className="management-page__message">
                    {notice}
                </div>
            )}

            {/* Shared content card */}
            <section className="management-page__card">

                <div className="management-page__card-header">
                    <h2>
                        {showForm ? formTitle : listTitle}
                    </h2>
                </div>

                {showForm ? (
                    <div className="management-page__form">
                        {showForm && !canShowForm ? (
                            <div className="management-page__message" role="alert">
                                You do not have permission to perform this action.
                            </div>
                        ) : children}
                    </div>
                ) : (
                    <>
                        {toolbar && (
                            <div
                                className="management-page__toolbar"
                                ref={toolbarRef}
                            >
                                {toolbar}
                            </div>
                        )}

                        <div
                            className="management-page__table-wrapper"
                            ref={tableWrapperRef}
                        >
                            {children}
                        </div>

                        {pagination && (
                            <div className="management-page__pagination">
                                {pagination}
                            </div>
                        )}
                    </>
                )}

            </section>

            {mobileTableDetail && (
                <div
                    className="management-page__detail-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setMobileTableDetail(null);
                        }
                    }}
                >
                    <section
                        className="management-page__detail-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="management-page-detail-title"
                        onKeyDown={(event) => {
                            if (event.key === "Tab") {
                                event.preventDefault();
                                mobileDetailsCloseRef.current?.focus();
                            }
                        }}
                    >
                        <header className="management-page__detail-header">
                            <h2 id="management-page-detail-title">
                                {mobileTableDetail.title}
                            </h2>
                            <button
                                ref={mobileDetailsCloseRef}
                                type="button"
                                className="management-page__detail-close"
                                onClick={() => setMobileTableDetail(null)}
                                aria-label="Close record details"
                            >
                                ×
                            </button>
                        </header>
                        <dl className="management-page__detail-fields">
                            {mobileTableDetail.fields.map((field, index) => (
                                <div key={`${field.label}-${index}`}>
                                    <dt>{field.label}</dt>
                                    <dd>{field.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                </div>
            )}
        </section>
    );
}
