const Button = ({ text, onClick, disabled = false, type = "button" }) => {
  return (
    <button
      className="login-btn"
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default Button;