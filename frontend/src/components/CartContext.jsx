import React, { createContext, useState, useContext, useMemo } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.units, 0);
  }, [cart]);

  const clearCart = () => {
    setCart([]);
  }

  return (
    <CartContext.Provider value={{ cart, setCart, cartCount, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);