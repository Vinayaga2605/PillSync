const ConfirmDialog = ({ title, message, confirmText = "Confirm", onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        <p className="modal__text">{message}</p>
        <div className="modal__actions">
          <button className="action-btn action-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="action-btn action-btn--danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
