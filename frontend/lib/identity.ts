"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * There's no auth in this system (architecture scope — see backend routes,
 * every create endpoint takes whatever id you hand it). The dashboard
 * represents "the creator using this browser," so which `creators` row that
 * is has to live somewhere client-side. localStorage is that somewhere —
 * one creator identity per browser, created once via POST /creators and
 * reused for every link this browser mints after that.
 */

const STORAGE_KEY = "nanoaffiliate:creator";

export interface StoredCreator {
  id: string;
  hedera_account_id: string;
}

function read(): StoredCreator | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCreator) : null;
  } catch {
    return null;
  }
}

function write(creator: StoredCreator | null) {
  try {
    if (creator) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(creator));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private mode, disabled storage) — identity just won't persist
  }
}

export function useCreatorIdentity() {
  const [creator, setCreatorState] = useState<StoredCreator | null | undefined>(undefined);

  useEffect(() => {
    setCreatorState(read());
  }, []);

  const setCreator = useCallback((c: StoredCreator) => {
    write(c);
    setCreatorState(c);
  }, []);

  const clearCreator = useCallback(() => {
    write(null);
    setCreatorState(null);
  }, []);

  return { creator, setCreator, clearCreator, loaded: creator !== undefined };
}
