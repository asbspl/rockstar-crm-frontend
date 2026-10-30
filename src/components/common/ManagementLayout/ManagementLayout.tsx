
import { useEffect, useRef, type ReactNode } from "react";
import "./ManagementLayout.css";

interface ManagementLayoutProps {
    title: string;
    description: string;
    showForm: boolean;
    listTitle: string;
    addButtonText: string;
    onAdd: () => void;
    onBack: () => void;
    formTitle: string;
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
    children,
    toolbar,
    pagination,
    notice,
    error,
}: ManagementLayoutProps) {

    const tableWrapperRef = useRef<HTMLDivElement>(null);

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

        wrapper.addEventListener("click", handleHeaderClick);

        // Support dynamically rendered tables and headers.
        const observer = new MutationObserver(() => {
            addSortingArrows();
        });

        observer.observe(wrapper, {
            childList: true,
            subtree: true,
        });

        return () => {
            wrapper.removeEventListener("click", handleHeaderClick);
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
                    <button
                        type="button"
                        className={
                            showForm
                                ? "management-page__back-button"
                                : "management-page__add-button"
                        }
                        onClick={showForm ? onBack : onAdd}
                    >
                        {showForm ? (
                            "Back to List"
                        ) : (
                            <>
                                <span aria-hidden="true">＋</span>
                                {addButtonText}
                            </>
                        )}
                    </button>
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
                        {children}
                    </div>
                ) : (
                    <>
                        {toolbar && (
                            <div className="management-page__toolbar">
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
        </section>
    );
}
