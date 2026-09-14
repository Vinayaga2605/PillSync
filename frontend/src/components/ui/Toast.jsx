const Toast = ({ message, type = "success", onClose }) => {
  if (!message) return null;

  return (
    <div className={`toast toast--${type}`} onClick={onClose}>
      <span>{type === "success" ? "Γ£ö" : "ΓÜá"}</span>
      {message}
      <button className="toast__close" aria-label="Dismiss">
        ├ù
      </button>
    </div>
  );
};

export default Toast;





