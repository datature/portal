import React, { useEffect, useState } from "react";
import { Intent, Position, Toaster } from "@blueprintjs/core";
import { APIIsAlive } from "@portal/api/general";
import isElectron from "is-electron";

let toaster = typeof window !== "undefined" ? Toaster.create({}) : null;

interface RunTimeProps {
  callbacks: {
    HandleHasCache: (hasCache: boolean) => void;
  };
}

/**
 * This function sends and checks for an acitve server app
 *
 * @returns {JSX.Element}
 */
// eslint-disable-next-line import/prefer-default-export
export function RuntimeChecker(props: RunTimeProps): JSX.Element {
  const refHandlers = {
    // eslint-disable-next-line no-return-assign
    toaster: (ref: Toaster) => (toaster = ref),
  };

  const [isRestart, setIsRestart] = useState(false);

  const checkForHeartbeat = () => {
    APIIsAlive()
      .then(result => {
        const askForCache = result.data.hasCache && !result.data.isCacheCalled;
        props.callbacks.HandleHasCache(askForCache);
        if (isRestart) setIsRestart(false);
      })
      .catch(() => {
        if (isElectron()) {
          toaster?.show({
            action: {
              onClick: () => {
                setIsRestart(true);
                toaster?.clear();
                const { ipcRenderer } = window.require("electron");
                ipcRenderer.send("restart-server");
              },
              text: "Restart?",
            },
            timeout: 25000,
            icon: "outdated",
            intent: Intent.WARNING,
            message: "Portal runtime is unresponsive.",
          });
        } else {
          toaster?.show({
            timeout: 25000,
            icon: "outdated",
            intent: Intent.WARNING,
            message: "Portal runtime is unresponsive. Please wait for a while",
          });
        }
      });
  };

  useEffect(() => {
    checkForHeartbeat();
    const interval = setInterval(checkForHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [isRestart]);

  return <Toaster position={Position.BOTTOM_RIGHT} ref={refHandlers.toaster} />;
}
