import React, { createContext, useContext, useEffect, useState } from "react";

export const ThemeContext = createContext(null);

export const THEME_STORAGE_KEY = "pillsync-theme";

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
    } catch (error) {
      console.warn("Could not read saved theme:", error);
    }

    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;

    // Set theme on <html>
    root.setAttribute("data-theme", theme);

    // Add/remove classes
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");

    // Save preference
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn("Could not save theme:", error);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  };

  const setTheme = (newTheme) => {
    if (newTheme === "dark" || newTheme === "light") {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
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
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
};

export default ThemeContext;



