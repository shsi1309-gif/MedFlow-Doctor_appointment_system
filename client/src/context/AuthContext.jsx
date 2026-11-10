import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("medflow_token") || localStorage.getItem("edoc_token"));
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.warn("Session expired or invalid, logging out:", err.message);
          localStorage.removeItem("medflow_token");
          localStorage.removeItem("edoc_token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password, expectedRole) => {
    const res = await api.login(email, password, expectedRole);
    localStorage.setItem("medflow_token", res.token);
    localStorage.removeItem("edoc_token");
    setToken(res.token);
    setUser(res.user);
    showToast(`Welcome back, ${res.user.name}!`);
    return res.user;
  };

  const demoLogin = async (role) => {
    let email = "admin@medflow.com";
    if (role === "doctor") email = "doctor@medflow.com";
    if (role === "patient") email = "patient@medflow.com";

    try {
      return await login(email, "123");
    } catch (err) {
      showToast(err.message, "error");
      throw err;
    }
  };

  const register = async (data) => {
    const res = await api.register(data);
    localStorage.setItem("medflow_token", res.token);
    localStorage.removeItem("edoc_token");
    setToken(res.token);
    setUser(res.user);
    showToast("Registration successful! Welcome to Medflow.");
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("medflow_token");
    localStorage.removeItem("edoc_token");
    setToken(null);
    setUser(null);
    showToast("Signed out successfully", "info");
  };

  const updateUserProfile = (newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        demoLogin,
        register,
        logout,
        updateUserProfile,
        toast,
        showToast
      }}
    >
      {children}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
