import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  X,
  Pill,
  Clock3,
  CalendarDays,
  Edit3,
  Trash2,
  Sun,
  CloudSun,
  Sunset,
  Moon,
  UserRound,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  ChevronRight,
  CalendarRange,
  Power,
  RefreshCw,
} from "lucide-react";

import medicationService from "../../services/medicationService";
import { scheduleService } from "../../services/scheduleService";
import {
  fetchAvailableCaregivers,
  requestCaregiver,
} from "../../services/api";

const WEEKDAYS = [
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
  { id: 7, label: "Sun" },
];

const FREQUENCIES = [
  {
    value: "DAILY",
    label: "Daily",
    description: "Every day",
  },
  {
    value: "WEEKLY",
    label: "Weekly",
    description: "Selected days",
  },
  {
    value: "SPECIFIC_DAYS",
    label: "Specific Days",
    description: "Selected days",
  },
  {
    value: "INTERVAL_DAYS",
    label: "Interval",
    description: "Every X days",
  },
  {
    value: "AS_NEEDED",
    label: "As Needed",
    description: "PRN",
  },
];

const TIME_OPTIONS = [
  {
    value: "MORNING",
    label: "Morning",
    icon: Sun,
  },
  {
    value: "AFTERNOON",
    label: "Afternoon",
    icon: CloudSun,
  },
  {
    value: "EVENING",
    label: "Evening",
    icon: Sunset,
  },
  {
    value: "NIGHT",
    label: "Night",
    icon: Moon,
  },
  {
    value: "CUSTOM",
    label: "Custom",
    icon: Clock3,
  },
];

const getToday = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(
    2,
    "0"
  )}`;
};

const getDefaultForm = () => ({
  frequency_type: "DAILY",
  dose_quantity: "1",
  dosage_unit: "tablet",
  days_of_week: [1, 2, 3, 4, 5, 6, 7],
  interval_days: 2,
  start_date: getToday(),
  end_date: "",
  instructions: "",
  is_active: true,
  times: [
    {
      scheduled_time: "08:00",
      time_of_day_type: "MORNING",
      dose_quantity: 1,
    },
  ],
});

const getTimeOfDay = (time) => {
  if (!time) return "MORNING";

  const hour = Number(String(time).split(":")[0]);

  if (hour >= 5 && hour <= 11) return "MORNING";
  if (hour >= 12 && hour <= 16) return "AFTERNOON";
  if (hour >= 17 && hour <= 20) return "EVENING";

  return "NIGHT";
};

const formatTime = (time) => {
  if (!time) return "Time not specified";

  const value = String(time).slice(0, 5);
  const [hourString, minute] = value.split(":");

  let hour = Number(hourString);

  if (Number.isNaN(hour)) return value;

  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
};

const formatDate = (value) => {
  if (!value) return "";

  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

const getFrequencyText = (schedule) => {
  switch (schedule.frequency_type) {
    case "DAILY":
      return "Daily";

    case "WEEKLY":
    case "SPECIFIC_DAYS": {
      const days = Array.isArray(schedule.days_of_week)
        ? schedule.days_of_week
        : [];

      const names = WEEKDAYS.filter((day) =>
        days.includes(day.id)
      ).map((day) => day.label);

      return names.length ? names.join(", ") : "Weekly";
    }

    case "INTERVAL_DAYS":
      return `Every ${schedule.interval_days || 1} days`;

    case "AS_NEEDED":
      return "As Needed";

    case "CUSTOM":
      return "Custom";

    default:
      return "Daily";
  }
};

const getTimeIcon = (type) => {
  const found = TIME_OPTIONS.find(
    (item) => item.value === type
  );

  return found?.icon || Clock3;
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "44px",
  padding: "10px 12px",
  border: "1px solid #dfe5ec",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#172033",
  fontSize: "14px",
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#5f6b7d",
  fontSize: "12px",
  fontWeight: 700,
};

const panelStyle = {
  background: "#ffffff",
  border: "1px solid #e3e8ee",
  borderRadius: "16px",
  boxShadow: "0 4px 16px rgba(23, 32, 51, 0.04)",
};

const PatientMyMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [scheduleGroups, setScheduleGroups] = useState([]);
  const [caregivers, setCaregivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(null);

  const [form, setForm] = useState(getDefaultForm());

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const medicinesResponse =
        await medicationService.getActiveMedicines();

      const medicineData =
        medicinesResponse?.data?.results ||
        medicinesResponse?.data ||
        [];

      const medicineList = Array.isArray(medicineData)
        ? medicineData
        : [];

      setMedicines(medicineList);

      const groups = await Promise.all(
        medicineList.map(async (medicine) => {
          try {
            const response =
              await scheduleService.getSchedules(
                medicine.id
              );

            const schedules = Array.isArray(response)
              ? response
              : response?.results || [];

            return {
              medicine,
              schedules: Array.isArray(schedules)
                ? schedules
                : [],
            };
          } catch (scheduleError) {
            console.error(
              `Failed to load schedules for ${medicine.name}:`,
              scheduleError
            );

            return {
              medicine,
              schedules: [],
            };
          }
        })
      );

      setScheduleGroups(groups);

      try {
        const caregiverData =
          await fetchAvailableCaregivers();

        setCaregivers(
          Array.isArray(caregiverData)
            ? caregiverData
            : []
        );
      } catch {
        setCaregivers([]);
      }
    } catch (err) {
      console.error("My Schedule error:", err);
      setError(
        "Unable to load your medication schedule."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const refresh = () => loadData();

    window.addEventListener(
      "pillsync-schedule-updated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "pillsync-schedule-updated",
        refresh
      );
    };
  }, []);

  const totalSchedules = useMemo(
    () =>
      scheduleGroups.reduce(
        (total, group) =>
          total + group.schedules.length,
        0
      ),
    [scheduleGroups]
  );

  const openCreateSchedule = (medicine = null) => {
    setSelectedMedicine(
      medicine || medicines[0] || null
    );
    setEditingSchedule(null);
    setForm(getDefaultForm());
    setShowForm(true);
    setError("");
  };

  const openEditSchedule = (
    medicine,
    schedule
  ) => {
    setSelectedMedicine(medicine);
    setEditingSchedule(schedule);

    setForm({
      frequency_type:
        schedule.frequency_type || "DAILY",

      dose_quantity: String(
        schedule.dose_quantity || 1
      ),

      dosage_unit:
        schedule.dosage_unit || "tablet",

      days_of_week:
        Array.isArray(schedule.days_of_week) &&
        schedule.days_of_week.length
          ? schedule.days_of_week
          : [1, 2, 3, 4, 5, 6, 7],

      interval_days:
        schedule.interval_days || 2,

      start_date:
        schedule.start_date || getToday(),

      end_date:
        schedule.end_date || "",

      instructions:
        schedule.instructions || "",

      is_active:
        schedule.is_active !== false,

      times:
        Array.isArray(schedule.times) &&
        schedule.times.length
          ? schedule.times.map((time) => ({
              scheduled_time: String(
                time.scheduled_time || "08:00"
              ).slice(0, 5),

              time_of_day_type:
                time.time_of_day_type ||
                getTimeOfDay(
                  time.scheduled_time
                ),

              dose_quantity:
                time.dose_quantity ||
                schedule.dose_quantity ||
                1,
            }))
          : getDefaultForm().times,
    });

    setShowForm(true);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSchedule(null);
    setSelectedMedicine(null);
    setForm(getDefaultForm());
    setError("");
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleDay = (dayId) => {
    setForm((current) => ({
      ...current,
      days_of_week:
        current.days_of_week.includes(dayId)
          ? current.days_of_week.filter(
              (day) => day !== dayId
            )
          : [
              ...current.days_of_week,
              dayId,
            ].sort(),
    }));
  };

  const updateTime = (
    index,
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      times: current.times.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
                ...(field === "scheduled_time"
                  ? {
                      time_of_day_type:
                        getTimeOfDay(value),
                    }
                  : {}),
              }
            : item
      ),
    }));
  };

  const addTime = () => {
    const last =
      form.times[form.times.length - 1];

    let nextTime = "12:00";

    if (last?.scheduled_time) {
      const [hour, minute] =
        last.scheduled_time.split(":");

      const nextHour =
        (Number(hour) + 4) % 24;

      nextTime = `${String(nextHour).padStart(
        2,
        "0"
      )}:${minute || "00"}`;
    }

    setForm((current) => ({
      ...current,
      times: [
        ...current.times,
        {
          scheduled_time: nextTime,
          time_of_day_type:
            getTimeOfDay(nextTime),
          dose_quantity:
            Number(
              current.dose_quantity
            ) || 1,
        },
      ],
    }));
  };

  const removeTime = (index) => {
    setForm((current) => ({
      ...current,
      times: current.times.filter(
        (_, itemIndex) =>
          itemIndex !== index
      ),
    }));
  };

  const saveSchedule = async (event) => {
    event.preventDefault();

    if (!selectedMedicine) {
      setError("Please select a medicine.");
      return;
    }

    const dose = Number(form.dose_quantity);

    if (!dose || dose <= 0) {
      setError(
        "Dose quantity must be greater than 0."
      );
      return;
    }

    if (!form.start_date) {
      setError("Start date is required.");
      return;
    }

    if (
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    if (
      form.frequency_type !==
        "AS_NEEDED" &&
      form.times.length === 0
    ) {
      setError(
        "Add at least one scheduled time."
      );
      return;
    }

    if (
      [
        "WEEKLY",
        "SPECIFIC_DAYS",
      ].includes(
        form.frequency_type
      ) &&
      form.days_of_week.length === 0
    ) {
      setError("Select at least one day.");
      return;
    }

    if (
      form.frequency_type ===
        "INTERVAL_DAYS" &&
      Number(form.interval_days) < 1
    ) {
      setError(
        "Interval must be at least 1 day."
      );
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      frequency_type:
        form.frequency_type,

      dose_quantity: dose,

      dosage_unit:
        form.dosage_unit.trim() ||
        "tablet",

      days_of_week: [
        "WEEKLY",
        "SPECIFIC_DAYS",
      ].includes(
        form.frequency_type
      )
        ? form.days_of_week
        : null,

      interval_days:
        form.frequency_type ===
        "INTERVAL_DAYS"
          ? Number(form.interval_days)
          : null,

      start_date: form.start_date,

      end_date:
        form.end_date || null,

      instructions:
        form.instructions.trim() ||
        null,

      is_active:
        Boolean(form.is_active),

      times:
        form.frequency_type ===
        "AS_NEEDED"
          ? []
          : form.times.map((time) => ({
              scheduled_time:
                time.scheduled_time,
              time_of_day_type:
                time.time_of_day_type,
              dose_quantity:
                Number(
                  time.dose_quantity
                ) || dose,
            })),
    };

    try {
      if (editingSchedule) {
        await scheduleService.updateSchedule(
          selectedMedicine.id,
          editingSchedule.id,
          payload
        );

        setMessage(
          "Medication schedule updated successfully."
        );
      } else {
        await scheduleService.createSchedule(
          selectedMedicine.id,
          payload
        );

        setMessage(
          "Medication schedule created successfully."
        );
      }

      closeForm();
      await loadData();

      window.dispatchEvent(
        new Event(
          "pillsync-schedule-updated"
        )
      );
    } catch (err) {
      console.error(
        "Schedule save failed:",
        err
      );

      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message;

      setError(
        typeof backendMessage === "string"
          ? backendMessage
          : "Unable to save the medication schedule."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async () => {
    if (
      !selectedMedicine ||
      !deletingSchedule
    ) {
      return;
    }

    try {
      await scheduleService.deleteSchedule(
        selectedMedicine.id,
        deletingSchedule.id
      );

      setDeletingSchedule(null);

      setMessage(
        "Medication schedule deleted successfully."
      );

      await loadData();

      window.dispatchEvent(
        new Event(
          "pillsync-schedule-updated"
        )
      );
    } catch (err) {
      console.error(
        "Schedule delete failed:",
        err
      );

      setError(
        "Unable to delete the medication schedule."
      );
    }
  };

  const handleCaregiverRequest = async (
    caregiverId
  ) => {
    try {
      await requestCaregiver(caregiverId);

      setMessage(
        "Caregiver request sent successfully."
      );
    } catch {
      setMessage(
        "Unable to send caregiver request."
      );
    }
  };

  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--color-bg, #f5f8fb)",
        padding: "32px 34px 50px",
        color: "var(--color-text, #172033)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        <div>
          <div
            style={{
              color: "var(--color-primary, #2f8f7f)",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "1.1px",
              textTransform: "uppercase",
            }}
          >
            Medication Management
          </div>

          <h1
            style={{
              margin: "7px 0 4px",
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.7px",
            }}
          >
            My Schedule
          </h1>

          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted, #738097)",
              fontSize: "15px",
            }}
          >
            Manage your medication schedules and dose timings.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            openCreateSchedule()
          }
          disabled={medicines.length === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            border: 0,
            borderRadius: "11px",
            background:
              medicines.length === 0
                ? "#a9c9c8"
                : "var(--color-primary, #14b8a6)",
            color: "#fff",
            padding: "13px 19px",
            fontSize: "13px",
            fontWeight: 700,
            cursor:
              medicines.length === 0
                ? "not-allowed"
                : "pointer",
            boxShadow:
              "0 5px 14px rgba(20,184,166,.18)",
          }}
        >
          <Plus size={16} />
          <span>Add Schedule</span>
        </button>
      </header>

      {message && (
        <div
          style={{
            marginBottom: "18px",
            padding: "13px 15px",
            border: "1px solid #c9eee4",
            borderRadius: "11px",
            background: "#effcf8",
            color: "#15806d",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
          }}
        >
          <CheckCircle2 size={17} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: "18px",
            padding: "13px 15px",
            border: "1px solid #f1d0d0",
            borderRadius: "11px",
            background: "#fff7f7",
            color: "#a94747",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
          }}
        >
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      <section style={panelStyle}>
        <div
          style={{
            padding: "22px 24px 18px",
            borderBottom: "1px solid #e8edf2",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 750,
              }}
            >
              Medication Schedules
            </h2>

            <div
              className="schedule-count-meta"
              style={{
                marginTop: "5px",
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                color: "#8390a3",
                fontSize: "13px",
              }}
            >
              <span>
                {medicines.length} medicines
              </span>

              <span
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#a5afb9",
                }}
                aria-hidden="true"
              />

              <span>
                {totalSchedules}{" "}
                {totalSchedules === 1
                  ? "schedule"
                  : "schedules"}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              minHeight: "260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#7d899b",
              gap: "10px",
            }}
          >
            <RefreshCw
              size={28}
              className="schedule-loading-icon"
            />
            Loading schedules...
          </div>
        ) : medicines.length === 0 ? (
          <div
            style={{
              padding: "55px 20px",
              textAlign: "center",
              color: "#7d899b",
            }}
          >
            <Pill
              size={42}
              style={{
                marginBottom: "12px",
                opacity: 0.55,
              }}
            />

            <h3
              style={{
                margin: "0 0 6px",
                color: "#273247",
              }}
            >
              No medicines available
            </h3>

            <p style={{ margin: 0 }}>
              Add a medicine before creating a schedule.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: "20px 24px 25px",
              display: "grid",
              gap: "18px",
            }}
          >
            {scheduleGroups.map(
              ({ medicine, schedules }) => (
                <div
                  key={medicine.id}
                  style={{
                    border:
                      "1px solid #e4e9ef",
                    borderRadius: "14px",
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      padding: "17px 18px",
                      background: "#fbfcfd",
                      borderBottom:
                        "1px solid #e8edf2",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "12px",
                          background:
                            "var(--color-primary-light, #e8f8f6)",
                          color:
                            "var(--color-primary, #0f9d91)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Pill size={20} />
                      </div>

                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: 750,
                          }}
                        >
                          {medicine.name}
                        </h3>

                        <p
                          style={{
                            margin: "3px 0 0",
                            color: "#8792a4",
                            fontSize: "12px",
                          }}
                        >
                          {medicine.dosage ||
                            "Dosage not specified"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openCreateSchedule(
                          medicine
                        )
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        border:
                          "1px solid #dbe5e8",
                        background:
                          "#ffffff",
                        color: "#187d77",
                        padding:
                          "8px 12px",
                        borderRadius:
                          "8px",
                        fontSize:
                          "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>

                  {schedules.length === 0 ? (
                    <div
                      style={{
                        padding: "28px",
                        textAlign: "center",
                        color: "#8a95a5",
                        fontSize: "13px",
                      }}
                    >
                      No schedule configured for this medicine.
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "13px",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      {schedules.map(
                        (schedule) => (
                          <div
                            key={
                              schedule.id
                            }
                            style={{
                              border:
                                "1px solid #e7ecf1",
                              borderRadius:
                                "12px",
                              padding:
                                "15px",
                              background:
                                "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                alignItems:
                                  "flex-start",
                                gap: "14px",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    flexWrap:
                                      "wrap",
                                    gap:
                                      "7px",
                                  }}
                                >
                                  <span
                                    style={{
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      gap:
                                        "5px",
                                      padding:
                                        "5px 9px",
                                      borderRadius:
                                        "999px",
                                      background:
                                        "#edf8f7",
                                      color:
                                        "#147f77",
                                      fontSize:
                                        "11px",
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    <CalendarRange size={12} />
                                    {
                                      getFrequencyText(
                                        schedule
                                      )
                                    }
                                  </span>

                                  <span
                                    style={{
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      gap:
                                        "5px",
                                      padding:
                                        "5px 9px",
                                      borderRadius:
                                        "999px",
                                      background:
                                        schedule.is_active
                                          ? "#effbf5"
                                          : "#f2f4f7",
                                      color:
                                        schedule.is_active
                                          ? "#198754"
                                          : "#7d8796",
                                      fontSize:
                                        "11px",
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    <Power size={11} />
                                    {schedule.is_active
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    marginTop:
                                      "8px",
                                    fontSize:
                                      "13px",
                                    fontWeight:
                                      700,
                                    color:
                                      "#253047",
                                  }}
                                >
                                  {
                                    schedule.dose_quantity
                                  }{" "}
                                  {schedule.dosage_unit ||
                                    "dose"}
                                </div>
                              </div>

                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap: "6px",
                                }}
                              >
                                <button
                                  type="button"
                                  title="Edit schedule"
                                  aria-label="Edit schedule"
                                  onClick={() =>
                                    openEditSchedule(
                                      medicine,
                                      schedule
                                    )
                                  }
                                  style={{
                                    width:
                                      "34px",
                                    height:
                                      "34px",
                                    border:
                                      "1px solid #dde4ea",
                                    borderRadius:
                                      "8px",
                                    background:
                                      "#fff",
                                    color:
                                      "#526176",
                                    cursor:
                                      "pointer",
                                  }}
                                >
                                  <Edit3
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  title="Delete schedule"
                                  aria-label="Delete schedule"
                                  onClick={() => {
                                    setSelectedMedicine(
                                      medicine
                                    );

                                    setDeletingSchedule(
                                      schedule
                                    );
                                  }}
                                  style={{
                                    width:
                                      "34px",
                                    height:
                                      "34px",
                                    border:
                                      "1px solid #f0d8d8",
                                    borderRadius:
                                      "8px",
                                    background:
                                      "#fff",
                                    color:
                                      "#c45a5a",
                                    cursor:
                                      "pointer",
                                  }}
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>
                              </div>
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                flexWrap:
                                  "wrap",
                                gap: "8px",
                                marginTop:
                                  "13px",
                              }}
                            >
                              {(
                                schedule.times ||
                                []
                              ).map(
                                (time) => {
                                  const Icon =
                                    getTimeIcon(
                                      time.time_of_day_type
                                    );

                                  return (
                                    <span
                                      key={
                                        time.id
                                      }
                                      style={{
                                        display:
                                          "inline-flex",
                                        alignItems:
                                          "center",
                                        gap:
                                          "6px",
                                        padding:
                                          "7px 10px",
                                        borderRadius:
                                          "8px",
                                        background:
                                          "#f7f9fb",
                                        border:
                                          "1px solid #e7ebef",
                                        color:
                                          "#4d5b70",
                                        fontSize:
                                          "12px",
                                      }}
                                    >
                                      <Icon
                                        size={
                                          14
                                        }
                                      />

                                      {formatTime(
                                        time.scheduled_time
                                      )}
                                    </span>
                                  );
                                }
                              )}
                            </div>

                            <div
                              style={{
                                marginTop:
                                  "11px",
                                display:
                                  "flex",
                                flexWrap:
                                  "wrap",
                                gap:
                                  "15px",
                                color:
                                  "#8a95a5",
                                fontSize:
                                  "12px",
                              }}
                            >
                              <span
                                style={{
                                  display:
                                    "inline-flex",
                                  alignItems:
                                    "center",
                                  gap:
                                    "6px",
                                }}
                              >
                                <CalendarDays
                                  size={
                                    13
                                  }
                                />

                                <span>
                                  {formatDate(
                                    schedule.start_date
                                  )}
                                </span>

                                {schedule.end_date ? (
                                  <>
                                    <ChevronRight
                                      size={13}
                                    />

                                    <span>
                                      {formatDate(
                                        schedule.end_date
                                      )}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight
                                      size={13}
                                    />

                                    <span>
                                      Ongoing
                                    </span>
                                  </>
                                )}
                              </span>

                              {schedule.instructions && (
                                <span
                                  style={{
                                    display:
                                      "inline-flex",
                                    alignItems:
                                      "center",
                                    gap:
                                      "5px",
                                  }}
                                >
                                  <FileTextIcon />
                                  {schedule.instructions}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section
        style={{
          ...panelStyle,
          marginTop: "20px",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom:
              "1px solid #e8edf2",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "19px",
              fontWeight: 750,
            }}
          >
            Connect Caregiver
          </h2>

          <p
            style={{
              margin:
                "5px 0 0",
              color:
                "#8490a2",
              fontSize:
                "13px",
            }}
          >
            Choose a caregiver to monitor your medication adherence.
          </p>
        </div>

        {caregivers.length === 0 ? (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#8994a5",
              fontSize: "13px",
            }}
          >
            <UserRound
              size={34}
              style={{
                marginBottom: "9px",
                opacity: 0.6,
              }}
            />

            <div>
              No caregivers available right now.
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "18px 24px 22px",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "12px",
            }}
          >
            {caregivers.map(
              (caregiver) => {
                const id =
                  caregiver.id ||
                  caregiver.user_id;

                return (
                  <div
                    key={id}
                    style={{
                      border:
                        "1px solid #e5eaf0",
                      borderRadius:
                        "11px",
                      padding:
                        "13px",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "8px",
                      }}
                    >
                      <UserRound
                        size={17}
                      />

                      <strong
                        style={{
                          fontSize:
                            "13px",
                        }}
                      >
                        {caregiver.full_name ||
                          caregiver.name ||
                          caregiver.username ||
                          "Caregiver"}
                      </strong>
                    </div>

                    {caregiver.email && (
                      <p
                        style={{
                          margin:
                            "6px 0 10px",
                          color:
                            "#8b95a5",
                          fontSize:
                            "11px",
                        }}
                      >
                        {
                          caregiver.email
                        }
                      </p>
                    )}

                    <button
                      type="button"
                      className="upload-btn secondary"
                      onClick={() =>
                        handleCaregiverRequest(
                          id
                        )
                      }
                      style={{
                        width:
                          "100%",
                      }}
                    >
                      <UserPlus size={14} />
                      <span>Request Caregiver</span>
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="modal-overlay"
          onClick={closeForm}
        >
          <div
            className="modal-card"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width:
                "min(760px, calc(100vw - 32px))",
              maxHeight:
                "92vh",
              overflowY:
                "auto",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap:
                  "15px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize:
                      "20px",
                  }}
                >
                  {editingSchedule
                    ? "Edit Medication Schedule"
                    : "Add Medication Schedule"}
                </h2>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    color:
                      "#8994a5",
                    fontSize:
                      "13px",
                  }}
                >
                  {
                    selectedMedicine?.name
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                title="Close"
                aria-label="Close"
                style={{
                  width:
                    "36px",
                  height:
                    "36px",
                  border:
                    "1px solid #dde4ea",
                  borderRadius:
                    "8px",
                  background:
                    "#fff",
                  cursor:
                    "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={
                saveSchedule
              }
              style={{
                marginTop:
                  "21px",
              }}
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap:
                    "14px",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Dose amount
                  </label>

                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      form.dose_quantity
                    }
                    onChange={(event) =>
                      updateForm(
                        "dose_quantity",
                        event.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Dosage unit
                  </label>

                  <input
                    type="text"
                    value={
                      form.dosage_unit
                    }
                    onChange={(event) =>
                      updateForm(
                        "dosage_unit",
                        event.target.value
                      )
                    }
                    placeholder="tablet"
                    style={
                      inputStyle
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop:
                    "19px",
                }}
              >
                <label style={labelStyle}>
                  Frequency
                </label>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap:
                      "8px",
                  }}
                >
                  {FREQUENCIES.map(
                    (option) => {
                      const active =
                        form.frequency_type ===
                        option.value;

                      return (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            updateForm(
                              "frequency_type",
                              option.value
                            )
                          }
                          style={{
                            textAlign:
                              "left",
                            border:
                              active
                                ? "2px solid #14b8a6"
                                : "1px solid #dfe5ec",
                            borderRadius:
                              "9px",
                            background:
                              active
                                ? "#effbf9"
                                : "#fff",
                            padding:
                              "10px",
                            color:
                              "#253047",
                            cursor:
                              "pointer",
                          }}
                        >
                          <strong
                            style={{
                              fontSize:
                                "12px",
                            }}
                          >
                            {
                              option.label
                            }
                          </strong>

                          <small
                            style={{
                              display:
                                "block",
                              marginTop:
                                "3px",
                              color:
                                "#8a95a5",
                            }}
                          >
                            {
                              option.description
                            }
                          </small>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {[
                "WEEKLY",
                "SPECIFIC_DAYS",
              ].includes(
                form.frequency_type
              ) && (
                <div
                  style={{
                    marginTop:
                      "18px",
                  }}
                >
                  <label style={labelStyle}>
                    Select days
                  </label>

                  <div
                    style={{
                      display:
                        "flex",
                      flexWrap:
                        "wrap",
                      gap:
                        "7px",
                    }}
                  >
                    {WEEKDAYS.map(
                      (day) => {
                        const active =
                          form.days_of_week.includes(
                            day.id
                          );

                        return (
                          <button
                            key={
                              day.id
                            }
                            type="button"
                            onClick={() =>
                              toggleDay(
                                day.id
                              )
                            }
                            style={{
                              padding:
                                "8px 11px",
                              border:
                                active
                                  ? "1px solid #14b8a6"
                                  : "1px solid #dfe5ec",
                              borderRadius:
                                "8px",
                              background:
                                active
                                  ? "#effbf9"
                                  : "#fff",
                              color:
                                "#364256",
                              cursor:
                                "pointer",
                              fontSize:
                                "12px",
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              day.label
                            }
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {form.frequency_type ===
                "INTERVAL_DAYS" && (
                <div
                  style={{
                    marginTop:
                      "18px",
                  }}
                >
                  <label style={labelStyle}>
                    Every how many days?
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      form.interval_days
                    }
                    onChange={(event) =>
                      updateForm(
                        "interval_days",
                        event.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>
              )}

              {form.frequency_type !==
                "AS_NEEDED" && (
                <div
                  style={{
                    marginTop:
                      "20px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      marginBottom:
                        "9px",
                    }}
                  >
                    <label
                      style={{
                        ...labelStyle,
                        marginBottom:
                          0,
                      }}
                    >
                      Scheduled dose times
                    </label>

                    <button
                      type="button"
                      className="upload-btn secondary"
                      onClick={
                        addTime
                      }
                    >
                      <Plus size={14} />
                      <span>Add Time</span>
                    </button>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gap:
                        "8px",
                    }}
                  >
                    {form.times.map(
                      (
                        time,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "1fr 1fr 40px",
                            gap:
                              "8px",
                          }}
                        >
                          <input
                            type="time"
                            value={
                              time.scheduled_time
                            }
                            onChange={(
                              event
                            ) =>
                              updateTime(
                                index,
                                "scheduled_time",
                                event
                                  .target
                                  .value
                              )
                            }
                            style={
                              inputStyle
                            }
                          />

                          <select
                            value={
                              time.time_of_day_type
                            }
                            onChange={(
                              event
                            ) =>
                              updateTime(
                                index,
                                "time_of_day_type",
                                event
                                  .target
                                  .value
                              )
                            }
                            style={
                              inputStyle
                            }
                          >
                            {TIME_OPTIONS.map(
                              (
                                option
                              ) => (
                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {
                                    option.label
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <button
                            type="button"
                            disabled={
                              form.times.length <=
                              1
                            }
                            onClick={() =>
                              removeTime(
                                index
                              )
                            }
                            title="Remove time"
                            aria-label="Remove time"
                            style={{
                              width:
                                "40px",
                              height:
                                "40px",
                              border:
                                "1px solid #e0e5eb",
                              borderRadius:
                                "8px",
                              background:
                                "#fff",
                              color:
                                "#c45a5a",
                              cursor:
                                "pointer",
                              opacity:
                                form.times.length <=
                                1
                                  ? 0.4
                                  : 1,
                            }}
                          >
                            <Trash2
                              size={
                                15
                              }
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap:
                    "14px",
                  marginTop:
                    "20px",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Start date
                  </label>

                  <input
                    type="date"
                    value={
                      form.start_date
                    }
                    onChange={(event) =>
                      updateForm(
                        "start_date",
                        event.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    End date
                  </label>

                  <input
                    type="date"
                    value={
                      form.end_date
                    }
                    onChange={(event) =>
                      updateForm(
                        "end_date",
                        event.target.value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <label style={labelStyle}>
                  Instructions
                </label>

                <textarea
                  rows={3}
                  value={
                    form.instructions
                  }
                  onChange={(event) =>
                    updateForm(
                      "instructions",
                      event.target.value
                    )
                  }
                  placeholder="Example: Take after breakfast."
                  style={{
                    ...inputStyle,
                    minHeight:
                      "88px",
                    resize:
                      "vertical",
                    display:
                      "block",
                    lineHeight:
                      1.5,
                  }}
                />
              </div>

              <label
                style={{
                  marginTop:
                    "17px",
                  padding:
                    "12px",
                  background:
                    "#f8fafb",
                  border:
                    "1px solid #e6ebf0",
                  borderRadius:
                    "10px",
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  cursor:
                    "pointer",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Power size={15} />

                  <span>
                    <strong
                      style={{
                        display:
                          "block",
                        fontSize:
                          "13px",
                      }}
                    >
                      Active schedule
                    </strong>

                    <small
                      style={{
                        color:
                          "#8792a3",
                      }}
                    >
                      Enable this schedule.
                    </small>
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={
                    form.is_active
                  }
                  onChange={(event) =>
                    updateForm(
                      "is_active",
                      event.target
                        .checked
                    )
                  }
                  style={{
                    width:
                      "18px",
                    height:
                      "18px",
                    accentColor:
                      "#14b8a6",
                  }}
                />
              </label>

              {error && (
                <div
                  style={{
                    marginTop:
                      "15px",
                    padding:
                      "11px 13px",
                    borderRadius:
                      "9px",
                    background:
                      "#fff7f7",
                    color:
                      "#a94747",
                    fontSize:
                      "13px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "7px",
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap:
                    "9px",
                  marginTop:
                    "20px",
                }}
              >
                <button
                  type="button"
                  className="upload-btn secondary"
                  onClick={
                    closeForm
                  }
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>

                <button
                  type="submit"
                  className="upload-btn primary"
                  disabled={
                    saving
                  }
                >
                  {saving ? (
                    <>
                      <Clock3
                        size={15}
                        className="schedule-saving-icon"
                      />
                      <span>Saving...</span>
                    </>
                  ) : editingSchedule ? (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Update Schedule</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      <span>Create Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingSchedule && (
        <div
          className="modal-overlay"
          onClick={() =>
            setDeletingSchedule(null)
          }
        >
          <div
            className="modal-card"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width:
                "min(420px, calc(100vw - 32px))",
            }}
          >
            <div
              style={{
                width: "45px",
                height: "45px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
                borderRadius: "12px",
                background: "#fef2f2",
                color: "#dc2626",
              }}
            >
              <Trash2 size={21} />
            </div>

            <h2
              style={{
                margin: 0,
                fontSize:
                  "19px",
              }}
            >
              Delete Schedule
            </h2>

            <p
              style={{
                marginTop:
                  "12px",
                color:
                  "#7d899b",
                lineHeight:
                  1.6,
                fontSize:
                  "14px",
              }}
            >
              Are you sure you want to delete this medication schedule?
            </p>

            <div
              style={{
                padding:
                  "12px",
                background:
                  "#f7f9fb",
                borderRadius:
                  "10px",
                marginTop:
                  "12px",
              }}
            >
              <strong>
                {
                  getFrequencyText(
                    deletingSchedule
                  )
                }
              </strong>

              <div
                style={{
                  marginTop:
                    "4px",
                  fontSize:
                    "12px",
                  color:
                    "#8792a3",
                }}
              >
                {
                  deletingSchedule.dose_quantity
                }{" "}
                {
                  deletingSchedule.dosage_unit ||
                  "dose"
                }
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap:
                  "8px",
                marginTop:
                  "20px",
              }}
            >
              <button
                type="button"
                className="upload-btn secondary"
                onClick={() =>
                  setDeletingSchedule(
                    null
                  )
                }
              >
                <X size={15} />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                className="upload-btn primary"
                style={{
                  background:
                    "#d15c5c",
                }}
                onClick={
                  deleteSchedule
                }
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .schedule-loading-icon {
          color: var(--color-primary, #2f8f7f);
          animation: schedule-spin 1s linear infinite;
        }

        .schedule-saving-icon {
          animation: schedule-spin 1s linear infinite;
        }

        .schedule-count-meta {
          line-height: 1;
        }

        @keyframes schedule-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 760px) {
          .schedule-count-meta {
            gap: 7px !important;
          }
        }
      `}</style>
    </div>
  );
};

const FileTextIcon = () => {
  return <FileText size={13} />;
};

export default PatientMyMedicines;
