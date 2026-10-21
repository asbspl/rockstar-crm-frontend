
import {
    useCallback,
    useEffect,
    useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import "./ConfirmDialog.css";

export type ConfirmDialogProps = {
    open: boolean;
    title?: string;
    message: string;
    itemName?: string;
    confirmText?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

type PopupMode = "confirm" | "alert" | "prompt";

type PopupRequest = {
    mode: PopupMode;
    id: number;
    title: string;
    message: string;
    itemName?: string;
    confirmText: string;
    defaultValue?: string;
    resolve: (value: boolean | string | null) => void;
};

type PopupOptions = {
    title?: string;
    itemName?: string;
    confirmText?: string;
    defaultValue?: string;
};

type PopupAPI = {
    confirm: (
        message: string,
        options?: PopupOptions,
    ) => Promise<boolean>;
    alert: (
        message: string,
        options?: PopupOptions,
    ) => Promise<void>;
    prompt: (
        message: string,
        options?: PopupOptions,
    ) => Promise<string | null>;
};

declare global {
    interface Window {
        crmPopup: PopupAPI;
    }
}

let queue: PopupRequest[] = [];
let nextId = 0;
let notify: (() => void) | null = null;
let hostRoot: Root | null = null;
let hostElement: HTMLDivElement | null = null;
let installed = false;

function renderHost() {
    notify?.();
}

function enqueue(
    mode: PopupMode,
    message: string,
    options: PopupOptions = {},
): Promise<boolean | string | null> {
    return new Promise((resolve) => {
        queue = [
            ...queue,
            {
                id: ++nextId,
                mode,
                title:
                    options.title ??
                    (mode === "confirm"
                        ? "Are you sure?"
                        : mode === "alert"
                          ? "Notification"
                          : "Enter a value"),
                message: String(message ?? ""),
                itemName: options.itemName,
                confirmText:
                    options.confirmText ??
                    (mode === "confirm" ? "Confirm" : "OK"),
                defaultValue: options.defaultValue,
                resolve,
            },
        ];

        renderHost();
    });
}

const popupAPI: PopupAPI = {
    confirm: async (message, options) =>
        (await enqueue("confirm", message, options)) === true,

    alert: async (message, options) => {
        await enqueue("alert", message, options);
    },

    prompt: async (message, options) => {
        const value = await enqueue("prompt", message, options);
        return typeof value === "string" ? value : null;
    },
};

function finishActive(value: boolean | string | null) {
    const active = queue[0];

    if (!active) return;

    queue = queue.slice(1);
    active.resolve(value);
    renderHost();
}

function installGlobalPopups() {
    if (installed || typeof document === "undefined") return;

    installed = true;
    window.crmPopup = popupAPI;

    // alert can be replaced directly.
    window.alert = (message?: unknown) => {
        void popupAPI.alert(String(message ?? ""));
    };

    // Native confirm/prompt are synchronous. These wrappers show the
    // custom popup, but legacy calls cannot receive its answer synchronously.
    window.confirm = (message?: string) => {
        void popupAPI.confirm(String(message ?? ""));
        return false;
    };

    window.prompt = (message?: string, defaultValue?: string) => {
        void popupAPI.prompt(String(message ?? ""), { defaultValue });
        return null;
    };

    hostElement = document.createElement("div");
    hostElement.id = "crm-global-popup-host";
    document.body.appendChild(hostElement);

    hostRoot = createRoot(hostElement);
    hostRoot.render(<GlobalPopupHost />);
}

function GlobalPopupHost() {
    const [active, setActive] = useState<PopupRequest | null>(
        queue[0] ?? null,
    );
    const [inputValue, setInputValue] = useState("");

    const sync = useCallback(() => {
        setActive(queue[0] ?? null);
    }, []);

    useEffect(() => {
        notify = sync;

        return () => {
            if (notify === sync) {
                notify = null;
            }
        };
    }, [sync]);

    useEffect(() => {
        setInputValue(active?.defaultValue ?? "");
    }, [active?.id, active?.defaultValue]);

    const close = (value: boolean | string | null) => {
        finishActive(value);
    };

    if (!active) return null;

    if (active.mode === "confirm") {
        return (
            <ConfirmDialog
                open
                title={active.title}
                message={active.message}
                itemName={active.itemName}
                confirmText={active.confirmText}
                onConfirm={() => close(true)}
                onCancel={() => close(false)}
            />
        );
    }

    const isAlert = active.mode === "alert";
    const isPrompt = active.mode === "prompt";

    return (
        <div
            className="global-dialog-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    close(isAlert ? true : null);
                }
            }}
        >
            <section
                className="global-confirm-dialog"
                role={isAlert ? "alertdialog" : "dialog"}
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
            >
                <div className="global-dialog-icon">
                    <i
                        className={
                            isAlert
                                ? "bi bi-info-circle"
                                : "bi bi-pencil-square"
                        }
                        aria-hidden="true"
                    />
                </div>

                <h2 id="confirm-dialog-title">{active.title}</h2>

                <p id="confirm-dialog-description">{active.message}</p>

                {isPrompt && (
                    <input
                        autoFocus
                        className="global-dialog-input"
                        value={inputValue}
                        onChange={(event) =>
                            setInputValue(event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                close(null);
                            }

                            if (event.key === "Enter") {
                                close(inputValue);
                            }
                        }}
                    />
                )}

                <div className="global-dialog-actions">
                    {isPrompt && (
                        <button
                            type="button"
                            className="global-dialog-cancel"
                            onClick={() => close(null)}
                        >
                            Cancel
                        </button>
                    )}

                    <button
                        type="button"
                        className="global-dialog-confirm"
                        autoFocus={isAlert}
                        onClick={() =>
                            close(isPrompt ? inputValue : true)
                        }
                    >
                        OK
                    </button>
                </div>
            </section>
        </div>
    );
}

export function GlobalPopupInstaller() {
    useEffect(() => {
        installGlobalPopups();
    }, []);

    return null;
}

export default function ConfirmDialog({
    open,
    title = "Are you sure?",
    message,
    itemName,
    confirmText = "Delete",
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const messageText = message.toLowerCase();
    const titleText = title.toLowerCase();
    const buttonText = confirmText.toLowerCase();

    // Detect status confirmations from their message, not just the title.
    // Examples: "Change Tesing Driver to Inactive?"
    //           "Change employee status to active?"
    const isStatusChange =
        /\bstatus\b/.test(messageText) ||
        /\bto\s+(?:in)?active\b/.test(messageText) ||
        /\bstatus\b/.test(titleText);

    const isDelete =
        /\bdelete\b/.test(messageText) ||
        /\bdelete\b/.test(titleText) ||
        /\bdelete\b/.test(buttonText) ||
        /\bremove\b/.test(messageText) ||
        /\bremove\b/.test(titleText);

    const dialogIcon = isStatusChange
        ? /\binactive\b/.test(messageText)
            ? "bi bi-toggle-off"
            : "bi bi-toggle-on"
        : isDelete
          ? "bi bi-trash3"
          : "bi bi-question-circle";

    const dialogWarning = isStatusChange
        ? "You are about to change this item's status."
        : isDelete
          ? "This action cannot be undone."
          : "Please confirm that you want to continue.";

    if (!open) return null;

    return (
        <div
            className="global-dialog-overlay"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !loading
                ) {
                    onCancel();
                }
            }}
        >
            <section
                className="global-confirm-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
            >
                <div className="global-dialog-icon">
                    <i
                        className={dialogIcon}
                        aria-hidden="true"
                    />
                </div>

                <h2 id="confirm-dialog-title">{title}</h2>

                <p id="confirm-dialog-description">{message}</p>

                {itemName && (
                    <div className="global-dialog-item-name">
                        “{itemName}”
                    </div>
                )}

                <p className="global-dialog-warning">
                    <i
                        className="bi bi-exclamation-triangle"
                        aria-hidden="true"
                    />
                    {dialogWarning}
                </p>

                <div className="global-dialog-actions">
                    <button
                        type="button"
                        className="global-dialog-cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="global-dialog-confirm"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        <i
                            className={dialogIcon}
                            aria-hidden="true"
                        />
                        {loading
                            ? "Processing..."
                            : confirmText}
                    </button>
                </div>
            </section>
        </div>
    );
}
