interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-3xl bg-zinc-900 p-5 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="h-12 rounded-2xl bg-zinc-800 font-medium hover:bg-zinc-700">
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className={`h-12 rounded-2xl font-semibold ${
              danger ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
