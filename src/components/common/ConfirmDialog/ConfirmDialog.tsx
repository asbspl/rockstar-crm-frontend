
import "./ConfirmDialog.css";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

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
  if (!open) return null;

  return (
    <div
      className="global-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
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
          <i className="bi bi-trash3" aria-hidden="true" />
        </div>

        <h2 id="confirm-dialog-title">{title}</h2>

        <p id="confirm-dialog-description">{message}</p>

        {itemName && (
          <div className="global-dialog-item-name">
            “{itemName}”
          </div>
        )}

        <p className="global-dialog-warning">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          This action cannot be undone.
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
            <i className="bi bi-trash3" aria-hidden="true" />
            {loading ? "Deleting..." : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}
