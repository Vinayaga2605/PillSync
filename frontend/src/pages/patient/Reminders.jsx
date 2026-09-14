import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BellRing,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Pill,
  RefreshCw,
  CircleAlert,
  CircleSlash2,
  AlarmClock,
  Volume2,
  VolumeX,
  Play,
} from "lucide-react";

import reminderService from "../../services/reminderService";

const ALARM_SETTINGS_KEY =
  "pillsync-alarm-settings";

const DEFAULT_ALARM_SETTINGS = {
  reminder_sound: true,
  reminder_sound_type: "classic",
  reminder_volume: 70,
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

const getMinutesFromTime = (time) => {
  if (!time) {
    return null;
  }

  const value = String(time).slice(0, 5);
  const parts = value.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
};

const getCurrentMinute = () => {
  const now = new Date();

  return (
    now.getHours() * 60 +
    now.getMinutes()
  );
};

const loadAlarmSettings = () => {
  try {
    const stored = localStorage.getItem(
      ALARM_SETTINGS_KEY
    );

    if (!stored) {
      return DEFAULT_ALARM_SETTINGS;
    }

    const parsed = JSON.parse(stored);

    return {
      ...DEFAULT_ALARM_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_ALARM_SETTINGS;
  }
};

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [alarmSettings, setAlarmSettings] =
    useState(loadAlarmSettings);

  const [dueReminderIds, setDueReminderIds] =
    useState([]);

  const audioContextRef = useRef(null);
  const alarmTriggeredRef = useRef(
    new Set()
  );

  const loadReminders = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await reminderService.generateTodayReminders();

        const data =
          response?.data || {};

        setReminders(
          Array.isArray(data.reminders)
            ? data.reminders
            : []
        );
      } catch (err) {
        console.error(
          "Failed to load reminders:",
          err
        );

        setError(
          "Unable to load today's medication reminders."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadReminders();

    const refresh = () => {
      loadReminders();
    };

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
  }, [loadReminders]);

  useEffect(() => {
    const refreshAlarmSettings = () => {
      setAlarmSettings(
        loadAlarmSettings()
      );
    };

    window.addEventListener(
      "storage",
      refreshAlarmSettings
    );

    const interval = setInterval(
      refreshAlarmSettings,
      2000
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshAlarmSettings
      );

      clearInterval(interval);
    };
  }, []);

  const stopAudioContext = useCallback(() => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch {
      audioContextRef.current = null;
    }
  }, []);

  const playAlarmTone = useCallback(
    async (settingsOverride = null) => {
      const currentSettings =
        settingsOverride ||
        loadAlarmSettings();

      if (
        !currentSettings.reminder_sound ||
        Number(
          currentSettings.reminder_volume
        ) <= 0
      ) {
        return;
      }

      try {
        const AudioContext =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContext) {
          return;
        }

        if (
          audioContextRef.current &&
          audioContextRef.current.state !==
            "closed"
        ) {
          try {
            await audioContextRef.current.resume();
          } catch {
            // Continue below if resume fails.
          }
        } else {
          audioContextRef.current =
            new AudioContext();
        }

        const audioContext =
          audioContextRef.current;

        if (
          audioContext.state ===
          "suspended"
        ) {
          await audioContext.resume();
        }

        const volume =
          Math.max(
            0,
            Math.min(
              Number(
                currentSettings.reminder_volume
              ) || 0,
              100
            )
          ) / 100;

        const type =
          currentSettings.reminder_sound_type ||
          "classic";

        const now =
          audioContext.currentTime;

        const createTone = (
          start,
          frequency,
          duration,
          oscillatorType = "sine"
        ) => {
          const oscillator =
            audioContext.createOscillator();

          const gain =
            audioContext.createGain();

          oscillator.type =
            oscillatorType;

          oscillator.frequency.setValueAtTime(
            frequency,
            start
          );

          const gainLevel =
            Math.max(
              0.001,
              0.28 * volume
            );

          gain.gain.setValueAtTime(
            0.001,
            start
          );

          gain.gain.exponentialRampToValueAtTime(
            gainLevel,
            start + 0.025
          );

          gain.gain.exponentialRampToValueAtTime(
            0.001,
            start + duration
          );

          oscillator.connect(gain);
          gain.connect(
            audioContext.destination
          );

          oscillator.start(start);
          oscillator.stop(
            start + duration
          );
        };

        if (type === "gentle") {
          createTone(
            now,
            523.25,
            0.5,
            "sine"
          );

          createTone(
            now + 0.55,
            659.25,
            0.5,
            "sine"
          );

          createTone(
            now + 1.1,
            783.99,
            0.7,
            "sine"
          );
        } else if (
          type === "urgent"
        ) {
          createTone(
            now,
            880,
            0.23,
            "square"
          );

          createTone(
            now + 0.3,
            880,
            0.23,
            "square"
          );

          createTone(
            now + 0.6,
            988,
            0.23,
            "square"
          );

          createTone(
            now + 0.9,
            880,
            0.3,
            "square"
          );
        } else {
          createTone(
            now,
            880,
            0.28,
            "sine"
          );

          createTone(
            now + 0.35,
            880,
            0.28,
            "sine"
          );

          createTone(
            now + 0.7,
            660,
            0.42,
            "sine"
          );
        }

        window.setTimeout(() => {
          if (
            audioContextRef.current ===
            audioContext
          ) {
            stopAudioContext();
          }
        }, 2200);
      } catch (err) {
        console.error(
          "Failed to play reminder alarm:",
          err
        );
      }
    },
    [stopAudioContext]
  );

  useEffect(() => {
    const checkDueReminders = () => {
      const currentMinute =
        getCurrentMinute();

      const due = reminders.filter(
        (reminder) => {
          if (
            reminder.status !==
            "pending"
          ) {
            return false;
          }

          const reminderMinute =
            getMinutesFromTime(
              reminder.time
            );

          if (
            reminderMinute === null
          ) {
            return false;
          }

          return (
            reminderMinute ===
            currentMinute
          );
        }
      );

      const dueIds = due.map(
        (reminder) => reminder.id
      );

      setDueReminderIds(dueIds);

      if (
        !alarmSettings.reminder_sound ||
        due.length === 0
      ) {
        return;
      }

      due.forEach((reminder) => {
        const reminderKey =
          `${new Date().toDateString()}-${reminder.id}-${getMinutesFromTime(
            reminder.time
          )}`;

        if (
          alarmTriggeredRef.current.has(
            reminderKey
          )
        ) {
          return;
        }

        alarmTriggeredRef.current.add(
          reminderKey
        );

        playAlarmTone(
          alarmSettings
        );

        setMessage(
          `Medication reminder: ${
            reminder.medicineName ||
            "Medicine"
          } is due now.`
        );
      });

      const todayPrefix =
        `${new Date().toDateString()}-`;

      alarmTriggeredRef.current.forEach(
        (key) => {
          if (
            !key.startsWith(
              todayPrefix
            )
          ) {
            alarmTriggeredRef.current.delete(
              key
            );
          }
        }
      );
    };

    checkDueReminders();

    const interval = setInterval(
      checkDueReminders,
      5000
    );

    return () =>
      clearInterval(interval);
  }, [
    reminders,
    alarmSettings,
    playAlarmTone,
  ]);

  useEffect(() => {
    return () => {
      stopAudioContext();
    };
  }, [stopAudioContext]);

  const handleStatus = async (
    id,
    status
  ) => {
    setActionLoading(id);
    setError("");
    setMessage("");

    try {
      await reminderService.updateReminderStatus(
        id,
        status
      );

      setReminders((current) =>
        current.map((reminder) =>
          reminder.id === id
            ? {
                ...reminder,
                status,
              }
            : reminder
        )
      );

      setDueReminderIds((current) =>
        current.filter(
          (reminderId) =>
            reminderId !== id
        )
      );

      const messages = {
        taken:
          "Medicine marked as taken.",
        missed:
          "Medicine marked as missed.",
        snoozed:
          "Medicine reminder snoozed.",
      };

      setMessage(
        messages[status] ||
          "Reminder updated."
      );

      window.dispatchEvent(
        new Event(
          "pillsync-schedule-updated"
        )
      );
    } catch (err) {
      console.error(
        "Failed to update reminder:",
        err
      );

      setError(
        "Unable to update this reminder."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const pending = useMemo(
    () =>
      reminders.filter(
        (reminder) =>
          reminder.status ===
          "pending"
      ),
    [reminders]
  );

  const completed = useMemo(
    () =>
      reminders.filter(
        (reminder) =>
          reminder.status ===
          "taken"
      ),
    [reminders]
  );

  const missed = useMemo(
    () =>
      reminders.filter(
        (reminder) =>
          reminder.status ===
          "missed"
      ),
    [reminders]
  );

  const snoozed = useMemo(
    () =>
      reminders.filter(
        (reminder) =>
          reminder.status ===
          "snoozed"
      ),
    [reminders]
  );

  const renderReminder = (
    reminder,
    readOnly = false
  ) => {
    const status =
      reminder.status ||
      "pending";

    const isLoading =
      actionLoading ===
      reminder.id;

    const isDue =
      dueReminderIds.includes(
        reminder.id
      );

    return (
      <div
        key={reminder.id}
        className={`reminder-item ${
          isDue
            ? "reminder-item-due"
            : ""
        }`}
        style={{
          background:
            "var(--color-surface, #ffffff)",
          border:
            "1px solid var(--color-border, #e4e9ef)",
          borderLeft:
            status === "taken"
              ? "4px solid #20a875"
              : status === "missed"
              ? "4px solid #df6b6b"
              : isDue
              ? "4px solid #f59e0b"
              : "4px solid var(--color-primary, #2f8f7f)",
          borderRadius: "14px",
          padding: "17px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "18px",
          boxShadow: isDue
            ? "0 8px 25px rgba(245,158,11,.15)"
            : "0 3px 12px rgba(23,32,51,.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "13px",
            minWidth: 0,
          }}
        >
          <div
            className={
              isDue
                ? "reminder-due-icon"
                : ""
            }
            style={{
              width: "44px",
              height: "44px",
              flexShrink: 0,
              borderRadius: "12px",
              background: isDue
                ? "#fff3d8"
                : "var(--color-primary-light, #eaf8f6)",
              color: isDue
                ? "#d97706"
                : "var(--color-primary, #11998e)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            {isDue ? (
              <BellRing size={21} />
            ) : (
              <Pill size={21} />
            )}
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: "7px",
                flexWrap:
                  "wrap",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 750,
                  color:
                    "var(--color-text, #172033)",
                }}
              >
                {reminder.medicineName ||
                  "Medicine"}
              </h3>

              {isDue && (
                <span className="due-now-badge">
                  <BellRing size={11} />
                  Due now
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                flexWrap:
                  "wrap",
                gap: "10px",
                marginTop: "5px",
                color:
                  "var(--color-text-muted, #718097)",
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: "5px",
                }}
              >
                <Pill size={13} />
                {reminder.dosage ||
                  "Dose not specified"}
              </span>

              <span
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: "5px",
                }}
              >
                <Clock3 size={13} />
                {formatTime(
                  reminder.time
                )}
              </span>
            </div>

            {reminder.label && (
              <p
                style={{
                  margin:
                    "6px 0 0",
                  color:
                    "#8a95a5",
                  fontSize:
                    "12px",
                }}
              >
                {reminder.label}
              </p>
            )}
          </div>
        </div>

        {!readOnly &&
        status === "pending" ? (
          <div
            style={{
              display: "flex",
              flexWrap:
                "wrap",
              gap: "7px",
              justifyContent:
                "flex-end",
            }}
          >
            <button
              type="button"
              className="btn-taken"
              disabled={
                isLoading
              }
              onClick={() =>
                handleStatus(
                  reminder.id,
                  "taken"
                )
              }
            >
              <CheckCircle2
                size={14}
              />

              <span>
                {isLoading
                  ? "Updating..."
                  : "Taken"}
              </span>
            </button>

            <button
              type="button"
              className="btn-missed"
              disabled={
                isLoading
              }
              onClick={() =>
                handleStatus(
                  reminder.id,
                  "missed"
                )
              }
            >
              <CircleSlash2
                size={14}
              />

              <span>
                Missed
              </span>
            </button>

            <button
              type="button"
              className="btn-snooze"
              disabled={
                isLoading
              }
              onClick={() =>
                handleStatus(
                  reminder.id,
                  "snoozed"
                )
              }
            >
              <AlarmClock
                size={14}
              />

              <span>
                Snooze
              </span>
            </button>
          </div>
        ) : (
          <span
            className={`status-badge ${status}`}
          >
            {status ===
            "taken" ? (
              <>
                <CheckCircle2
                  size={13}
                />

                <span>
                  Taken
                </span>
              </>
            ) : status ===
              "missed" ? (
              <>
                <CircleSlash2
                  size={13}
                />

                <span>
                  Missed
                </span>
              </>
            ) : status ===
              "snoozed" ? (
              <>
                <AlarmClock
                  size={13}
                />

                <span>
                  Snoozed
                </span>
              </>
            ) : (
              <>
                <Clock3
                  size={13}
                />

                <span>
                  Pending
                </span>
              </>
            )}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className="reminders-page-content"
      style={{
        minHeight:
          "100%",
        background:
          "var(--color-bg, #f5f8fb)",
        padding:
          "32px 34px 50px",
        color:
          "var(--color-text, #172033)",
      }}
    >
      <style>{`
        .reminders-action-btn,
        .btn-taken,
        .btn-missed,
        .btn-snooze {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 9px;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          transition:
            background-color .2s ease,
            border-color .2s ease,
            transform .2s ease;
        }

        .btn-taken {
          border: 1px solid #a6e8c2;
          background: #effcf5;
          color: #087443;
        }

        .btn-missed {
          border: 1px solid #f2caca;
          background: #fff5f5;
          color: #b42318;
        }

        .btn-snooze {
          border: 1px solid #dce2e8;
          background: var(--color-surface, #ffffff);
          color: #475467;
        }

        .btn-taken:hover,
        .btn-missed:hover,
        .btn-snooze:hover {
          transform: translateY(-1px);
        }

        .btn-taken:disabled,
        .btn-missed:disabled,
        .btn-snooze:disabled {
          opacity: .55;
          cursor: not-allowed;
          transform: none;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 750;
        }

        .status-badge.taken {
          background: #ecfdf3;
          color: #087443;
        }

        .status-badge.missed {
          background: #fff1f3;
          color: #b42318;
        }

        .status-badge.snoozed {
          background: #f2f4f7;
          color: #475467;
        }

        .status-badge.pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .reminders-refresh-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid var(--color-border, #dce4eb);
          border-radius: 11px;
          background: var(--color-surface, #ffffff);
          color: var(--color-text, #243149);
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(23,32,51,.03);
          transition: .2s ease;
        }

        .reminders-refresh-btn:hover {
          border-color: var(--color-primary, #2f8f7f);
          color: var(--color-primary, #2f8f7f);
        }

        .reminders-refresh-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .reminders-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .reminders-summary-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e3e8ee);
          border-radius: 14px;
          padding: 17px 18px;
        }

        .reminders-summary-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6d7b91;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .6px;
          text-transform: uppercase;
        }

        .reminders-summary-value {
          margin-top: 6px;
          font-size: 28px;
          font-weight: 800;
          color: var(--color-text, #172033);
        }

        .reminders-summary-helper {
          margin-top: 3px;
          color: #8b96a6;
          font-size: 12px;
        }

        .reminders-panel {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e3e8ee);
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(23,32,51,.04);
          overflow: hidden;
        }

        .reminders-panel-header {
          padding: 22px 24px 18px;
          border-bottom: 1px solid var(--color-border, #e8edf2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .reminders-panel-kicker {
          color: var(--color-primary, #2f8f7f);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .9px;
          text-transform: uppercase;
        }

        .reminders-panel-header h2 {
          margin: 6px 0 4px;
          font-size: 21px;
          font-weight: 800;
          color: var(--color-text, #273247);
        }

        .reminders-panel-header p {
          margin: 0;
          color: #8290a3;
          font-size: 13px;
        }

        .reminders-panel-content {
          padding: 18px 24px 25px;
        }

        .reminders-group {
          margin-bottom: 24px;
        }

        .reminders-group:last-child {
          margin-bottom: 0;
        }

        .reminders-group-header {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 11px;
        }

        .reminders-group-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 750;
          color: var(--color-text, #273247);
        }

        .reminders-list {
          display: grid;
          gap: 10px;
        }

        .reminders-empty {
          padding: 55px 20px;
          text-align: center;
          color: #8994a5;
        }

        .reminders-empty-icon {
          margin-bottom: 12px;
          opacity: .55;
        }

        .reminders-empty h3 {
          margin: 0 0 6px;
          color: var(--color-text, #273247);
        }

        .reminders-empty p {
          margin: 0;
          font-size: 13px;
        }

        .due-now-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 7px;
          border-radius: 999px;
          background: #fff3d8;
          color: #b45309;
          font-size: 9px;
          font-weight: 800;
        }

        .reminder-item-due {
          animation: reminderDuePulse 1.5s ease-in-out infinite;
        }

        .reminder-due-icon {
          animation: reminderBellPulse 1s ease-in-out infinite;
        }

        .reminder-alarm-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 17px;
          padding: 12px 15px;
          border: 1px solid #f2d5a0;
          border-radius: 11px;
          background: #fffaf0;
          color: #a16207;
          font-size: 12px;
          font-weight: 700;
        }

        .reminder-alarm-banner svg {
          flex-shrink: 0;
        }

        @keyframes reminderDuePulse {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes reminderBellPulse {
          0%,
          100% {
            transform: rotate(0deg);
          }

          25% {
            transform: rotate(-7deg);
          }

          75% {
            transform: rotate(7deg);
          }
        }

        @media (max-width: 850px) {
          .reminders-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .reminders-page-content {
            padding: 22px 18px 35px !important;
          }

          .reminders-header {
            flex-direction: column !important;
          }

          .reminders-refresh-btn {
            width: 100%;
          }

          .reminders-summary-grid {
            grid-template-columns: 1fr;
          }

          .reminders-panel-header {
            align-items: flex-start;
          }

          .reminders-panel-content {
            padding: 16px;
          }
        }

        @media (max-width: 520px) {
          .btn-taken,
          .btn-missed,
          .btn-snooze {
            flex: 1;
          }
        }
      `}</style>

      <header
        className="reminders-header"
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: "20px",
          marginBottom:
            "27px",
        }}
      >
        <div>
          <div
            style={{
              color:
                "var(--color-primary, #2f8f7f)",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing:
                "1.1px",
              textTransform:
                "uppercase",
            }}
          >
            Patient Dashboard
          </div>

          <h1
            style={{
              margin:
                "7px 0 4px",
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing:
                "-0.7px",
              color:
                "var(--color-text, #172033)",
            }}
          >
            Reminders
          </h1>

          <p
            style={{
              margin: 0,
              color:
                "var(--color-text-muted, #738097)",
              fontSize: "15px",
            }}
          >
            Your medication reminders for today.
          </p>
        </div>

        <button
          type="button"
          className="reminders-refresh-btn"
          onClick={
            loadReminders
          }
          disabled={loading}
        >
          <RefreshCw
            size={15}
          />

          <span>
            Refresh
          </span>
        </button>
      </header>

      {dueReminderIds.length >
        0 &&
        alarmSettings.reminder_sound && (
          <div className="reminder-alarm-banner">
            <BellRing size={16} />

            <span>
              Medication reminder due now. Your configured
              alarm is active.
            </span>

            <Volume2 size={15} />
          </div>
        )}

      {message && (
        <div
          style={{
            marginBottom:
              "17px",
            padding:
              "13px 15px",
            border:
              "1px solid #c9eee4",
            borderRadius:
              "11px",
            background:
              "#effcf8",
            color:
              "#15806d",
            display:
              "flex",
            alignItems:
              "center",
            gap: "8px",
            fontSize:
              "13px",
          }}
        >
          <CheckCircle2
            size={17}
          />

          <span>
            {message}
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom:
              "17px",
            padding:
              "13px 15px",
            border:
              "1px solid #f1d0d0",
            borderRadius:
              "11px",
            background:
              "#fff7f7",
            color:
              "#a94747",
            display:
              "flex",
            alignItems:
              "center",
            gap: "8px",
            fontSize:
              "13px",
          }}
        >
          <AlertCircle
            size={17}
          />

          <span>
            {error}
          </span>
        </div>
      )}

      <div className="reminders-summary-grid">
        <div className="reminders-summary-card">
          <div className="reminders-summary-label">
            <Clock3
              size={14}
            />

            <span>
              Pending
            </span>
          </div>

          <div className="reminders-summary-value">
            {pending.length}
          </div>

          <div className="reminders-summary-helper">
            doses to take
          </div>
        </div>

        <div className="reminders-summary-card">
          <div className="reminders-summary-label">
            <CheckCircle2
              size={14}
            />

            <span>
              Completed
            </span>
          </div>

          <div className="reminders-summary-value">
            {completed.length}
          </div>

          <div className="reminders-summary-helper">
            doses taken today
          </div>
        </div>

        <div className="reminders-summary-card">
          <div className="reminders-summary-label">
            <CircleAlert
              size={14}
            />

            <span>
              Missed
            </span>
          </div>

          <div className="reminders-summary-value">
            {missed.length}
          </div>

          <div className="reminders-summary-helper">
            doses missed today
          </div>
        </div>
      </div>

      <section className="reminders-panel">
        <div className="reminders-panel-header">
          <div>
            <div className="reminders-panel-kicker">
              Medication Plan
            </div>

            <h2>
              Today's Reminders
            </h2>

            <p>
              {reminders.length}{" "}
              {reminders.length ===
              1
                ? "dose"
                : "doses"}{" "}
              scheduled today
            </p>
          </div>

          {alarmSettings.reminder_sound ? (
            <Volume2
              size={22}
              color="var(--color-primary, #2f8f7f)"
            />
          ) : (
            <VolumeX
              size={22}
              color="#94a3b8"
            />
          )}
        </div>

        {loading ? (
          <div
            className="reminders-empty"
            style={{
              minHeight:
                "260px",
              display:
                "flex",
              flexDirection:
                "column",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            <RefreshCw
              size={32}
              style={{
                marginBottom:
                  "10px",
                animation:
                  "reminders-spin 1s linear infinite",
                color:
                  "var(--color-primary, #2f8f7f)",
              }}
            />

            Loading today's reminders...
          </div>
        ) : reminders.length ===
          0 ? (
          <div className="reminders-empty">
            <BellRing
              size={42}
              className="reminders-empty-icon"
            />

            <h3>
              No reminders for today
            </h3>

            <p>
              Your active medication schedules will
              appear here.
            </p>
          </div>
        ) : (
          <div className="reminders-panel-content">
            {pending.length >
              0 && (
              <section className="reminders-group">
                <div className="reminders-group-header">
                  <Clock3
                    size={17}
                    color="var(--color-text-muted, #708096)"
                  />

                  <h3>
                    Pending (
                    {
                      pending.length
                    }
                    )
                  </h3>
                </div>

                <div className="reminders-list">
                  {pending.map(
                    (
                      reminder
                    ) =>
                      renderReminder(
                        reminder
                      )
                  )}
                </div>
              </section>
            )}

            {snoozed.length >
              0 && (
              <section className="reminders-group">
                <div className="reminders-group-header">
                  <AlarmClock
                    size={17}
                    color="var(--color-text-muted, #708096)"
                  />

                  <h3>
                    Snoozed (
                    {
                      snoozed.length
                    }
                    )
                  </h3>
                </div>

                <div className="reminders-list">
                  {snoozed.map(
                    (
                      reminder
                    ) =>
                      renderReminder(
                        reminder
                      )
                  )}
                </div>
              </section>
            )}

            {completed.length >
              0 && (
              <section className="reminders-group">
                <div className="reminders-group-header">
                  <CheckCircle2
                    size={17}
                    color="#20a875"
                  />

                  <h3>
                    Completed Today (
                    {
                      completed.length
                    }
                    )
                  </h3>
                </div>

                <div className="reminders-list">
                  {completed.map(
                    (
                      reminder
                    ) =>
                      renderReminder(
                        reminder,
                        true
                      )
                  )}
                </div>
              </section>
            )}

            {missed.length >
              0 && (
              <section className="reminders-group">
                <div className="reminders-group-header">
                  <CircleAlert
                    size={17}
                    color="#d96868"
                  />

                  <h3>
                    Missed Today (
                    {
                      missed.length
                    }
                    )
                  </h3>
                </div>

                <div className="reminders-list">
                  {missed.map(
                    (
                      reminder
                    ) =>
                      renderReminder(
                        reminder,
                        true
                      )
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      <style>{`
        @keyframes reminders-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Reminders;
