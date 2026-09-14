import { useNavigate } from "react-router-dom";

const RoleCard = ({ icon, title, description }) => {
  const navigate = useNavigate();

  const tones = { patient: "tone--patient", caregiver: "tone--caregiver", administrator: "tone--admin" };
  const tone = tones[title.toLowerCase()] || "tone--patient";

  const handleContinue = () => {
    navigate(`/login/${title.toLowerCase()}`);
  };

  return (
    <div className={`role-card ${tone}`}>
      <span className="role-card__icon">{icon}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="continue-btn" onClick={handleContinue}>
        Continue
        <span className="continue-btn__arrow" aria-hidden="true">ΓåÆ</span>
      </button>
    </div>
  );
};

export default RoleCard;





