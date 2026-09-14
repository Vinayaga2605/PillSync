import React, { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Volume2,
  VolumeX,
  AlertTriangle,
  RefreshCw,
  Shield,
  Clock3,
  Globe,
  CalendarDays,
  Save,
  CheckCircle,
  Loader2,
  AlertCircle,
  Play,
} from "lucide-react";

import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const ALARM_SETTINGS_KEY =
  "pillsync-alarm-settings";

const DEFAULT_SETTINGS = {
  theme: "light",
  medication_reminders: true,
  missed_dose_alerts: true,
  refill_alerts: true,
  system_notifications: true,
  reminder_sound: true,
  reminder_sound_type: "classic",
  reminder_volume: 70,
  reminder_lead_time: 15,
  language: "English",
  time_format: "12",
  date_format: "DD/MM/YYYY",
};

const Settings = () => {
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState(
    DEFAULT_SETTINGS
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [alarmPlaying, setAlarmPlaying] =
    useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/auth/settings/"
      );

      const data = response.data || {};

      let localAlarmSettings = {};

      try {
        const stored =
          localStorage.getItem(
            ALARM_SETTINGS_KEY
          );

        if (stored) {
          localAlarmSettings =
            JSON.parse(stored);
        }
      } catch {
        localAlarmSettings = {};
      }

      const loadedSettings = {
        ...DEFAULT_SETTINGS,
        ...data,
        ...localAlarmSettings,
      };

      setSettings(loadedSettings);

      if (
        loadedSettings.theme === "light" ||
        loadedSettings.theme === "dark" ||
        loadedSettings.theme === "system"
      ) {
        setTheme(loadedSettings.theme);
      }
    } catch (err) {
      console.error(
        "Failed to load settings:",
        err
      );

      let localAlarmSettings = {};

      try {
        const stored =
          localStorage.getItem(
            ALARM_SETTINGS_KEY
          );

        if (stored) {
          localAlarmSettings =
            JSON.parse(stored);
        }
      } catch {
        localAlarmSettings = {};
      }

      setSettings((previous) => ({
        ...previous,
        ...localAlarmSettings,
      }));

      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Unable to load your settings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = (name, value) => {
    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSaved(false);
    setError("");
  };

  const handleThemeChange = (value) => {
    setTheme(value);

    setSettings((previous) => ({
      ...previous,
      theme: value,
    }));

    setSaved(false);
    setError("");
  };

  const saveLocalAlarmSettings = (
    nextSettings
  ) => {
    try {
      localStorage.setItem(
        ALARM_SETTINGS_KEY,
        JSON.stringify({
          reminder_sound:
            nextSettings.reminder_sound,
          reminder_sound_type:
            nextSettings.reminder_sound_type,
          reminder_volume:
            nextSettings.reminder_volume,
        })
      );
    } catch (storageError) {
      console.error(
        "Failed to save local alarm settings:",
        storageError
      );
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const payload = {
        theme,
        medication_reminders:
          settings.medication_reminders,
        missed_dose_alerts:
          settings.missed_dose_alerts,
        refill_alerts:
          settings.refill_alerts,
        system_notifications:
          settings.system_notifications,
        reminder_sound:
          settings.reminder_sound,
        reminder_lead_time:
          Number(settings.reminder_lead_time),
        language:
          settings.language,
        time_format:
          settings.time_format,
        date_format:
          settings.date_format,
      };

      const response =
        await api.patch(
          "/auth/settings/",
          payload
        );

      const updatedSettings =
        response.data || payload;

      const finalSettings = {
        ...settings,
        ...updatedSettings,
      };

      setSettings(finalSettings);

      if (
        finalSettings.theme === "light" ||
        finalSettings.theme === "dark" ||
        finalSettings.theme === "system"
      ) {
        setTheme(finalSettings.theme);
      }

      saveLocalAlarmSettings(
        finalSettings
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (err) {
      console.error(
        "Failed to save settings:",
        err
      );

      saveLocalAlarmSettings(
        settings
      );

      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Unable to save your settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const playAlarmTone = ({
    type =
      settings.reminder_sound_type,
    volume =
      settings.reminder_volume,
  } = {}) => {
    if (alarmPlaying) {
      return;
    }

    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        setError(
          "Your browser does not support alarm sound playback."
        );
        return;
      }

      const audioContext =
        new AudioContext();

      if (
        audioContext.state ===
        "suspended"
      ) {
        audioContext.resume();
      }

      const normalizedVolume =
        Math.max(
          0,
          Math.min(
            Number(volume) || 0,
            100
          )
        ) / 100;

      setAlarmPlaying(true);

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
            0.28 *
              normalizedVolume
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

      const duration =
        type === "gentle"
          ? 1900
          : type === "urgent"
          ? 1500
          : 1400;

      setTimeout(() => {
        audioContext.close();
        setAlarmPlaying(false);
      }, duration);
    } catch (err) {
      console.error(
        "Failed to play alarm:",
        err
      );

      setAlarmPlaying(false);

      setError(
        "Unable to play the test alarm."
      );
    }
  };

  const handleAlarmChange = (
    name,
    value
  ) => {
    const nextSettings = {
      ...settings,
      [name]: value,
    };

    setSettings(nextSettings);
    setSaved(false);
    setError("");

    if (
      name === "reminder_sound" ||
      name === "reminder_sound_type" ||
      name === "reminder_volume"
    ) {
      saveLocalAlarmSettings(
        nextSettings
      );
    }
  };

  const Toggle = ({
    checked,
    onChange,
    disabled = false,
  }) => (
    <button
      type="button"
      className={`ps-settings-toggle ${
        checked ? "active" : ""
      }`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      disabled={disabled}
    >
      <span />
    </button>
  );

  if (loading) {
    return (
      <div className="ps-settings-loading-page">
        <style>
          {`
            .ps-settings-loading-page {
              min-height: calc(100vh - 68px);
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--color-bg);
              color: var(--color-primary);
              box-sizing: border-box;
            }

            .ps-settings-loading-content {
              display: flex;
              align-items: center;
              gap: 9px;
              font-size: 13px;
              font-weight: 600;
            }

            .ps-settings-spinner {
              animation: psSettingsSpin 1s linear infinite;
            }

            @keyframes psSettingsSpin {
              from {
                transform: rotate(0deg);
              }

              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>

        <div className="ps-settings-loading-content">
          <Loader2
            size={19}
            className="ps-settings-spinner"
          />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="ps-settings-page">
      <style>
        {`
          .ps-settings-page {
            min-height: calc(100vh - 68px);
            padding: 28px;
            background: var(--color-bg);
            color: var(--color-text);
            box-sizing: border-box;
            transition:
              background-color 0.25s ease,
              color 0.25s ease;
          }

          .ps-settings-container {
            max-width: 1180px;
            margin: 0 auto;
          }

          .ps-settings-heading {
            margin-bottom: 24px;
          }

          .ps-settings-heading h1 {
            margin: 0;
            color: var(--color-text);
            font-size: 27px;
            font-weight: 800;
            letter-spacing: -0.02em;
          }

          .ps-settings-heading p {
            margin: 6px 0 0;
            color: var(--color-text-muted);
            font-size: 13px;
          }

          .ps-settings-card {
            margin-bottom: 18px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 14px;
            box-shadow: var(--shadow-soft);
            transition:
              background-color 0.25s ease,
              border-color 0.25s ease,
              box-shadow 0.25s ease;
          }

          .ps-settings-card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 18px 20px;
            border-bottom: 1px solid var(--color-border);
          }

          .ps-settings-card-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--color-primary-light);
            color: var(--color-primary);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ps-settings-card-header h3 {
            margin: 0;
            color: var(--color-text);
            font-size: 14px;
            font-weight: 750;
          }

          .ps-settings-card-body {
            padding: 4px 20px;
          }

          .ps-settings-row {
            min-height: 62px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 1px solid var(--color-border);
          }

          .ps-settings-row:last-child {
            border-bottom: none;
          }

          .ps-settings-row-info {
            display: flex;
            align-items: center;
            gap: 11px;
            min-width: 0;
          }

          .ps-settings-row-icon {
            width: 30px;
            height: 30px;
            min-width: 30px;
            border-radius: 8px;
            background: var(--color-surface-alt);
            color: var(--color-text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ps-settings-row-text {
            min-width: 0;
          }

          .ps-settings-row-text strong {
            display: block;
            color: var(--color-text);
            font-size: 13px;
            font-weight: 700;
          }

          .ps-settings-row-text span {
            display: block;
            margin-top: 3px;
            color: var(--color-text-muted);
            font-size: 11px;
            line-height: 1.35;
          }

          .ps-settings-toggle {
            width: 40px;
            height: 22px;
            padding: 2px;
            border: none;
            border-radius: 999px;
            background: var(--color-border-strong);
            cursor: pointer;
            transition: background 0.15s ease;
            flex-shrink: 0;
          }

          .ps-settings-toggle:disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }

          .ps-settings-toggle span {
            display: block;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--color-surface);
            box-shadow:
              0 1px 3px rgba(0, 0, 0, 0.18);
            transition: transform 0.15s ease;
          }

          .ps-settings-toggle.active {
            background: var(--color-primary);
          }

          .ps-settings-toggle.active span {
            transform: translateX(18px);
          }

          .ps-settings-select {
            min-width: 145px;
            height: 36px;
            padding: 0 10px;
            border: 1px solid var(--color-border-strong);
            border-radius: 8px;
            background: var(--color-surface);
            color: var(--color-text);
            font-size: 12px;
            outline: none;
          }

          .ps-settings-select:focus {
            border-color: var(--color-primary);
            box-shadow: var(--shadow-focus);
          }

          .ps-settings-number-input {
            width: 80px;
            height: 36px;
            padding: 0 10px;
            border: 1px solid var(--color-border-strong);
            border-radius: 8px;
            background: var(--color-surface);
            color: var(--color-text);
            font-size: 12px;
            outline: none;
          }

          .ps-settings-number-input:focus {
            border-color: var(--color-primary);
            box-shadow: var(--shadow-focus);
          }

          .ps-settings-volume-control {
            display: flex;
            align-items: center;
            gap: 9px;
            min-width: 190px;
          }

          .ps-settings-volume-control input[type="range"] {
            width: 125px;
            accent-color: var(--color-primary);
            cursor: pointer;
          }

          .ps-settings-volume-value {
            min-width: 38px;
            color: var(--color-text);
            font-size: 11px;
            font-weight: 750;
            text-align: right;
          }

          .ps-settings-test-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-height: 34px;
            padding: 7px 12px;
            border: 1px solid var(--color-primary);
            border-radius: 8px;
            background: var(--color-primary-light);
            color: var(--color-primary);
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
          }

          .ps-settings-test-btn:hover {
            background: var(--color-primary);
            color: #ffffff;
          }

          .ps-settings-test-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .ps-settings-alarm-note {
            margin: 10px 0 16px;
            padding: 10px 12px;
            border-radius: 8px;
            background: var(--color-surface-alt);
            color: var(--color-text-muted);
            font-size: 10px;
            line-height: 1.45;
          }

          .ps-settings-alarm-note strong {
            color: var(--color-text);
          }

          .ps-settings-theme {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            padding: 18px 20px 20px;
          }

          .ps-settings-theme-option {
            min-height: 78px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 7px;
            border: 1px solid var(--color-border);
            border-radius: 10px;
            background: var(--color-surface);
            color: var(--color-text-muted);
            cursor: pointer;
            transition:
              background 0.15s ease,
              border-color 0.15s ease,
              color 0.15s ease;
          }

          .ps-settings-theme-option:hover {
            background: var(--color-surface-alt);
            color: var(--color-text);
          }

          .ps-settings-theme-option.selected {
            border-color: var(--color-primary);
            background: var(--color-primary-light);
            color: var(--color-primary);
          }

          .ps-settings-theme-option span {
            font-size: 11px;
            font-weight: 700;
          }

          .ps-settings-feedback {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-top: 18px;
            padding: 11px 13px;
            border-radius: 9px;
            font-size: 12px;
            font-weight: 600;
          }

          .ps-settings-error {
            color: var(--color-danger);
            background: var(--color-danger-bg);
            border: 1px solid var(--color-border);
          }

          .ps-settings-save-bar {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;
            margin-top: 22px;
          }

          .ps-settings-saved {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--color-success);
            font-size: 12px;
            font-weight: 650;
          }

          .ps-settings-save-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            min-height: 38px;
            min-width: 126px;
            padding: 8px 14px;
            border: 1px solid var(--color-primary);
            border-radius: 9px;
            background: var(--color-primary);
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition:
              background 0.15s ease,
              transform 0.15s ease;
          }

          .ps-settings-save-btn:hover {
            background: var(--color-primary-dark);
            transform: translateY(-1px);
          }

          .ps-settings-save-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }

          .ps-settings-save-spinner {
            animation:
              psSettingsSaveSpin 1s linear infinite;
          }

          @keyframes psSettingsSaveSpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 700px) {
            .ps-settings-page {
              padding: 18px;
            }

            .ps-settings-theme {
              grid-template-columns: 1fr;
            }

            .ps-settings-row {
              min-height: 70px;
            }

            .ps-settings-select {
              min-width: 125px;
            }

            .ps-settings-volume-control {
              min-width: 145px;
            }

            .ps-settings-volume-control input[type="range"] {
              width: 90px;
            }
          }
        `}
      </style>

      <div className="ps-settings-container">
        <div className="ps-settings-heading">
          <h1>Settings</h1>

          <p>
            Customize your PillSync experience and
            notification preferences.
          </p>
        </div>

        {error && (
          <div
            className="ps-settings-feedback ps-settings-error"
            role="alert"
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Appearance */}
        <div className="ps-settings-card">
          <div className="ps-settings-card-header">
            <div className="ps-settings-card-icon">
              {theme === "dark" ? (
                <Moon size={16} />
              ) : theme === "system" ? (
                <Monitor size={16} />
              ) : (
                <Sun size={16} />
              )}
            </div>

            <h3>Appearance</h3>
          </div>

          <div className="ps-settings-theme">
            <button
              className={`ps-settings-theme-option ${
                theme === "light"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                handleThemeChange("light")
              }
              type="button"
              disabled={saving}
            >
              <Sun size={20} />
              <span>Light</span>
            </button>

            <button
              className={`ps-settings-theme-option ${
                theme === "dark"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                handleThemeChange("dark")
              }
              type="button"
              disabled={saving}
            >
              <Moon size={20} />
              <span>Dark</span>
            </button>

            <button
              className={`ps-settings-theme-option ${
                theme === "system"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                handleThemeChange(
                  "system"
                )
              }
              type="button"
              disabled={saving}
            >
              <Monitor size={20} />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="ps-settings-card">
          <div className="ps-settings-card-header">
            <div className="ps-settings-card-icon">
              <Bell size={16} />
            </div>

            <h3>Notifications</h3>
          </div>

          <div className="ps-settings-card-body">
            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  <Bell size={15} />
                </div>

                <div className="ps-settings-row-text">
                  <strong>
                    Medication reminders
                  </strong>

                  <span>
                    Receive reminders for scheduled
                    medicines.
                  </span>
                </div>
              </div>

              <Toggle
                checked={
                  settings.medication_reminders
                }
                onChange={(value) =>
                  updateSetting(
                    "medication_reminders",
                    value
                  )
                }
                disabled={saving}
              />
            </div>

            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  <AlertTriangle size={15} />
                </div>

                <div className="ps-settings-row-text">
                  <strong>
                    Missed-dose alerts
                  </strong>

                  <span>
                    Get notified when a scheduled
                    dose is missed.
                  </span>
                </div>
              </div>

              <Toggle
                checked={
                  settings.missed_dose_alerts
                }
                onChange={(value) =>
                  updateSetting(
                    "missed_dose_alerts",
                    value
                  )
                }
                disabled={saving}
              />
            </div>

            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  <RefreshCw size={15} />
                </div>

                <div className="ps-settings-row-text">
                  <strong>
                    Refill alerts
                  </strong>

                  <span>
                    Receive low-stock and refill
                    reminders.
                  </span>
                </div>
              </div>

              <Toggle
                checked={
                  settings.refill_alerts
                }
                onChange={(value) =>
                  updateSetting(
                    "refill_alerts",
                    value
                  )
                }
                disabled={saving}
              />
            </div>

            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  <Shield size={15} />
                </div>

                <div className="ps-settings-row-text">
                  <strong>
                    System notifications
                  </strong>

                  <span>
                    Important PillSync system
                    updates and messages.
                  </span>
                </div>
              </div>

              <Toggle
                checked={
                  settings.system_notifications
                }
                onChange={(value) =>
                  updateSetting(
                    "system_notifications",
                    value
                  )
                }
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Reminder Preferences */}
        <div className="ps-settings-card">
          <div className="ps-settings-card-header">
            <div className="ps-settings-card-icon">
              <Clock3 size={16} />
            </div>

            <h3>Reminder Preferences</h3>
          </div>

          <div className="ps-settings-card-body">
            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  {settings.reminder_sound ? (
                    <Volume2 size={15} />
                  ) : (
                    <VolumeX size={15} />
                  )}
                </div>

                <div className="ps-settings-row-text">
                  <strong>Reminder alarm</strong>

                  <span>
                    Play an alarm sound when a medicine
                    reminder reaches its scheduled time.
                  </span>
                </div>
              </div>

              <Toggle
                checked={
                  settings.reminder_sound
                }
                onChange={(value) =>
                  handleAlarmChange(
                    "reminder_sound",
                    value
                  )
                }
                disabled={saving}
              />
            </div>

            {settings.reminder_sound && (
              <>
                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-icon">
                      <Volume2 size={15} />
                    </div>

                    <div className="ps-settings-row-text">
                      <strong>
                        Alarm sound
                      </strong>

                      <span>
                        Choose the sound style used
                        for medication reminders.
                      </span>
                    </div>
                  </div>

                  <select
                    className="ps-settings-select"
                    value={
                      settings.reminder_sound_type
                    }
                    onChange={(event) =>
                      handleAlarmChange(
                        "reminder_sound_type",
                        event.target.value
                      )
                    }
                    disabled={saving}
                  >
                    <option value="classic">
                      Classic
                    </option>

                    <option value="gentle">
                      Gentle
                    </option>

                    <option value="urgent">
                      Urgent
                    </option>
                  </select>
                </div>

                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-icon">
                      <Volume2 size={15} />
                    </div>

                    <div className="ps-settings-row-text">
                      <strong>
                        Alarm volume
                      </strong>

                      <span>
                        Set the volume for reminder
                        alarm playback.
                      </span>
                    </div>
                  </div>

                  <div className="ps-settings-volume-control">
                    <VolumeX size={14} />

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={
                        settings.reminder_volume
                      }
                      onChange={(event) =>
                        handleAlarmChange(
                          "reminder_volume",
                          Number(
                            event.target.value
                          )
                        )
                      }
                      disabled={saving}
                      aria-label="Alarm volume"
                    />

                    <Volume2 size={14} />

                    <span className="ps-settings-volume-value">
                      {settings.reminder_volume}%
                    </span>
                  </div>
                </div>

                <div className="ps-settings-row">
                  <div className="ps-settings-row-info">
                    <div className="ps-settings-row-icon">
                      <Play size={15} />
                    </div>

                    <div className="ps-settings-row-text">
                      <strong>
                        Test alarm
                      </strong>

                      <span>
                        Play a sample using your current
                        alarm settings.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ps-settings-test-btn"
                    onClick={() =>
                      playAlarmTone()
                    }
                    disabled={
                      alarmPlaying ||
                      saving ||
                      Number(
                        settings.reminder_volume
                      ) === 0
                    }
                  >
                    {alarmPlaying ? (
                      <>
                        <Loader2
                          size={13}
                          className="ps-settings-spinner"
                        />
                        Playing
                      </>
                    ) : (
                      <>
                        <Play size={13} />
                        Test Alarm
                      </>
                    )}
                  </button>
                </div>

                <div className="ps-settings-alarm-note">
                  <strong>How it works:</strong>{" "}
                  the browser alarm will be triggered by
                  the reminder page when a scheduled dose
                  becomes due. Keep this tab open and allow
                  sound playback in your browser.
                </div>
              </>
            )}

            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  <Clock3 size={15} />
                </div>

                <div className="ps-settings-row-text">
                  <strong>
                    Reminder lead time
                  </strong>

                  <span>
                    Time before the scheduled dose to
                    send a reminder.
                  </span>
                </div>
              </div>

              <select
                className="ps-settings-select"
                value={String(
                  settings.reminder_lead_time
                )}
                onChange={(event) =>
                  updateSetting(
                    "reminder_lead_time",
                    Number(
                      event.target.value
                    )
                  )
                }
                disabled={saving}
              >
                <option value="5">
                  5 minutes
                </option>

                <option value="10">
                  10 minutes
                </option>

                <option value="15">
                  15 minutes
                </option>

                <option value="30">
                  30 minutes
                </option>

                <option value="60">
                  1 hour
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Regional Preferences */}
        <div className="ps-settings-card">
          <div className="ps-settings-card-header">
            <div className="ps-settings-card-icon">
              <Globe size={16} />
            </div>

            <h3>Regional Preferences</h3>
          </div>

          <div className="ps-settings-card-body">
            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  <Globe size={15} />
                </div>

                <div className="ps-settings-row-text">
                  <strong>Language</strong>

                  <span>
                    Select your preferred display
                    language.
                  </span>
                </div>
              </div>

              <select
                className="ps-settings-select"
                value={
                  settings.language
                }
                onChange={(event) =>
                  updateSetting(
                    "language",
                    event.target.value
                  )
                }
                disabled={saving}
              >
                <option value="English">
                  English
                </option>
              </select>
            </div>

            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  <Clock3 size={15} />
                </div>

                <div className="ps-settings-row-text">
                  <strong>Time format</strong>

                  <span>
                    Choose how times are displayed.
                  </span>
                </div>
              </div>

              <select
                className="ps-settings-select"
                value={
                  settings.time_format
                }
                onChange={(event) =>
                  updateSetting(
                    "time_format",
                    event.target.value
                  )
                }
                disabled={saving}
              >
                <option value="12">
                  12-hour
                </option>

                <option value="24">
                  24-hour
                </option>
              </select>
            </div>

            <div className="ps-settings-row">
              <div className="ps-settings-row-info">
                <div className="ps-settings-row-icon">
                  <CalendarDays size={15} />
                </div>

                <div className="ps-settings-row-text">
                  <strong>Date format</strong>

                  <span>
                    Choose how dates are displayed.
                  </span>
                </div>
              </div>

              <select
                className="ps-settings-select"
                value={
                  settings.date_format
                }
                onChange={(event) =>
                  updateSetting(
                    "date_format",
                    event.target.value
                  )
                }
                disabled={saving}
              >
                <option value="DD/MM/YYYY">
                  DD/MM/YYYY
                </option>

                <option value="MM/DD/YYYY">
                  MM/DD/YYYY
                </option>

                <option value="YYYY-MM-DD">
                  YYYY-MM-DD
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="ps-settings-save-bar">
          {saved && (
            <div className="ps-settings-saved">
              <CheckCircle size={15} />
              Settings saved
            </div>
          )}

          <button
            className="ps-settings-save-btn"
            onClick={saveSettings}
            type="button"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2
                  size={15}
                  className="ps-settings-save-spinner"
                />
                Saving...
              </>
            ) : (
              <>
                <Save size={15} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;