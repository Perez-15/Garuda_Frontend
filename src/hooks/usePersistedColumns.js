// hooks/usePersistedColumns.js
import { useState, useEffect } from 'react';

/**
 * Persists column visibility and order per user in localStorage.
 *
 * @param {string}   pageKey       - Unique key for the page (e.g. 'hired', 'inprocess')
 * @param {number|string} userId   - Current user's ID
 * @param {string[]} defaultCols   - Default visible column keys
 * @returns {{ visibleCols, colOrder, toggleColumn, setColOrder }}
 */
export function usePersistedColumns(pageKey, userId, defaultCols) {
  const storageKey = `${pageKey}_cols_user_${userId}`;

  const getStored = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw); // { visible: [...], order: [...] }
    } catch {
      return null;
    }
  };

  const stored = getStored();

  const [visibleCols, setVisibleCols] = useState(stored?.visible ?? defaultCols);
  const [colOrder,    setColOrderRaw] = useState(stored?.order   ?? defaultCols);

  // Persist to localStorage whenever visible or order changes
  const persist = (visible, order) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ visible, order }));
    } catch {
      // localStorage full or unavailable — fail silently
    }
  };

  const setColOrder = (newOrder) => {
    setColOrderRaw(newOrder);
    persist(visibleCols, newOrder);
  };

  const toggleColumn = (key, allColumns) => {
    const col = allColumns.find((c) => c.key === key);
    if (col?.always) return;

    let newVisible, newOrder;

    if (visibleCols.includes(key)) {
      newVisible = visibleCols.filter((k) => k !== key);
      newOrder   = colOrder.filter((k) => k !== key);
    } else {
      newVisible = [...visibleCols, key];
      newOrder   = [...colOrder, key];
    }

    setVisibleCols(newVisible);
    setColOrderRaw(newOrder);
    persist(newVisible, newOrder);
  };

  // If userId changes (e.g. account switch), re-read from localStorage
  useEffect(() => {
    const s = getStored();
    if (s) {
      setVisibleCols(s.visible);
      setColOrderRaw(s.order);
    } else {
      setVisibleCols(defaultCols);
      setColOrderRaw(defaultCols);
    }
  }, [userId]);

  return { visibleCols, colOrder, toggleColumn, setColOrder };
}