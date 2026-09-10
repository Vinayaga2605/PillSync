import React, {
  createContext,
  useState,
} from "react";

import authService from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    authService.getCurrentUser()
  );

  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    const data = await authService.login(
      username,
      password
    );

    setUser(data.user);

    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;