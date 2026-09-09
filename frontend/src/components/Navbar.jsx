import { useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const onLogin = location.pathname.startsWith("/login");
  const actionLabel = onLogin ? "Create account" : "Get started";

  const handleAction = () => {
    navigate(onLogin ? "/register/admin" : "/register/patient");
  };

  return (
    <nav className="navbar">
      <div className="navbar__brand" onClick={() => navigate("/")}>
        <span className="navbar__logo">💊</span>
        <span className="navbar__name">PillSync</span>
      </div>
      <button className="navbar__cta" onClick={handleAction}>
        {actionLabel}
      </button>
    </nav>
  );
};

export default Navbar;