
import type { ReactNode } from "react";
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

                        <div className="management-page__table-wrapper">
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
