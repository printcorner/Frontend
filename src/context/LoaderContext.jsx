import React, { createContext, useContext, useEffect, useState } from "react";
import { BACKEND_URL } from "../config";
import SplashScreen from "../components/SplashScreen";

const LoaderContext = createContext(null);

export const useLoader = () => useContext(LoaderContext);

export const LoaderProvider = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    let progressTimer = null;
    let pingTimer = null;
    let isMounted = true;

    const splashDelay = setTimeout(() => {
      if (!isMounted) return;

      setShowSplash(true);

      progressTimer = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 1 : p));
      }, 700);
    }, 400);

    const checkHealth = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`);
        if (!isMounted) return;

        if (res.ok) {
          setProgress(100);

          // smooth finish
          setTimeout(() => {
            if (isMounted) setReady(true);
          }, 300);

          clearTimeout(splashDelay);
          if (progressTimer) clearInterval(progressTimer);
          if (pingTimer) clearInterval(pingTimer);
        }
      } catch {}
    };

    checkHealth();
    pingTimer = setInterval(checkHealth, 5000);

    return () => {
      isMounted = false;
      clearTimeout(splashDelay);
      if (progressTimer) clearInterval(progressTimer);
      if (pingTimer) clearInterval(pingTimer);
    };
  }, []);

  // 🚫 Backend ready → no splash at all
  if (ready) {
    return (
      <LoaderContext.Provider value={{}}>{children}</LoaderContext.Provider>
    );
  }

  // 💤 Backend slow → show splash
  if (showSplash) {
    return <SplashScreen progress={progress} />;
  }

  // ⏳ Waiting briefly to decide
  return null;
};
