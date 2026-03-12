"use client";

import { useEffect } from "react";
import { initFirebaseAnalytics } from "@/lib/firebase";

export function FirebaseInit() {
  useEffect(() => {
    initFirebaseAnalytics();
  }, []);
  return null;
}
