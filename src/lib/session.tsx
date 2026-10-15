import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export const SessionContext = createContext<Session | null | undefined>(undefined);
export const useStoreSession = () => useContext(SessionContext);