import { cache } from "react";
import { isAdmin as fetchIsAdmin } from "./auth";

export const isAdmin = cache(fetchIsAdmin);
