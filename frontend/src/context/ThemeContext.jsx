import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export const ThemeContext = createContext(null);

export const THEME_STORAGE_KEY = "pillsync-theme";

const getSystemTheme = () => {
  if (
    typeof window === "undefined" ||
    !window.matchMedia
  ) {
    return "light";
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
};

const applyThemeToDocument = (selectedTheme) => {
  const root = document.documentElement;

  const resolvedTheme =
    selectedTheme === "system"
      ? getSystemTheme()
      : selectedTheme;

  root.setAttribute(
    "data-theme",
    resolvedTheme
  );

  root.setAttribute(
    "data-theme-preference",
    selectedTheme
  );

  root.classList.toggle(
    "dark",
    resolvedTheme === "dark"
  );

  root.classList.toggle(
    "light",
    resolvedTheme === "light"
  );

  document.body.classList.toggle(
    "dark",
    resolvedTheme === "dark"
  );

  document.body.classList.toggle(
    "light",
    resolvedTheme === "light"
  );
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(
        THEME_STORAGE_KEY
      );

      if (
        savedTheme === "dark" ||
        savedTheme === "light" ||
        savedTheme === "system"
      ) {
        return savedTheme;
      }
    } catch (error) {
      console.warn(
        "Could not read saved theme:",
        error
      );
    }

    return "light";
  });

  useEffect(() => {
    applyThemeToDocument(theme);

    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        theme
      );
    } catch (error) {
      console.warn(
        "Could not save theme:",
        error
      );
    }
  }, [theme]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.matchMedia
    ) {
      return;
    }

    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyThemeToDocument("system");
      }
    };

    mediaQuery.addEventListener(
      "change",
      handleSystemThemeChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange
      );
    };
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((currentTheme) => {
      if (currentTheme === "dark") {
        return "light";
      }

      return "dark";
    });
  };

  const setTheme = (newTheme) => {
    if (
      newTheme === "dark" ||
      newTheme === "light" ||
      newTheme === "system"
    ) {
      setThemeState(newTheme);
    }
  };

  const resolvedTheme =
    theme === "system"
      ? getSystemTheme()
      : theme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark: resolvedTheme === "dark",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
};

export default ThemeContext;