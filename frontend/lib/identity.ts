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
// Multiple components (Topbar, Products, Settings, Links) each hold their own
// hook instance — `storage` events only fire in *other* tabs, so writes need
// their own same-tab broadcast for every instance to pick up the change.
const CHANGE_EVENT = "nanoaffiliate:creator-changed";

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
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useCreatorIdentity() {
  const [creator, setCreatorState] = useState<StoredCreator | null | undefined>(undefined);

  useEffect(() => {
    setCreatorState(read());
    const onChange = () => setCreatorState(read());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setCreator = useCallback((c: StoredCreator) => {
    write(c);
  }, []);

  const clearCreator = useCallback(() => {
    write(null);
  }, []);

  return { creator, setCreator, clearCreator, loaded: creator !== undefined };
}
