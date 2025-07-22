import { createContext, useState, useEffect } from "react";

export const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  const [role, setRole] = useState(localStorage.getItem("role"));

  useEffect(() => {
    localStorage.setItem("role", role);
  }, [role]);

  const logout = () => {
    localStorage.removeItem("role");
    setRole(null);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, logout }}>
      {children}
    </RoleContext.Provider>
  );
};
