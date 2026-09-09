import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import RoleCard from "../components/RoleCard";

const FEATURES = [
  {
    icon: "⏰",
    title: "Smart Reminders",
    text: "Timely, role-specific reminders for every dose so nothing slips through.",
  },
  {
    icon: "🔔",
    title: "Intelligent Alerts",
    text: "Missed-dose, refill and summary alerts synced to medication logs in real time.",
  },
  {
    icon: "📊",
    title: "Analytics & Reports",
    text: "Adherence trends, exportable reports and medicine-level refill predictions.",
  },
];

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <main className="home">
        <span className="home__eyebrow">
          <span className="home__badge-dot" />
          Smart medication management
        </span>
        <h1>Medication, made <span>simple.</span></h1>
        <p className="home__sub">
          PillSync helps patients, caregivers and administrators keep
          medication schedules on track with intelligent reminders and
          real-time alerts.
        </p>

        <div className="home__actions">
          <button className="home__cta" onClick={() => navigate("/register/patient")}>
            Get started free
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <section className="feature-strip" aria-label="Key features">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <span className="feature__icon">{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="cards" aria-label="Choose your role">
          <RoleCard
            icon="👤"
            title="Patient"
            description="Manage medicines, reminders and track your adherence."
          />
          <RoleCard
            icon="❤️"
            title="Caregiver"
            description="Monitor and support your assigned patients' medication."
          />
          <RoleCard
            icon="🏥"
            title="Administrator"
            description="Manage users, records and the PillSync platform."
          />
        </section>

        <footer className="home__foot">
          <span>PillSync · Medication Management Platform</span>
        </footer>
      </main>
    </>
  );
};

export default HomePage;