const StatCard = ({ icon, label, value, delta, tone = "primary", deltaTone }) => {
  return (
    <div className="stat">
      <div className="stat__head">
        <span className={`stat__icon stat__icon--${tone}`}>{icon}</span>
        {delta && (
          <span className={`stat__delta stat__delta--${deltaTone || "up"}`}>
            {delta}
          </span>
        )}
      </div>
      <p className="stat__value">{value}</p>
      <p className="stat__label">{label}</p>
    </div>
  );
};

export default StatCard;





