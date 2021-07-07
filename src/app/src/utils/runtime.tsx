import React, { useEffect, useState } from "react";
import { Intent, Spinner, SpinnerSize } from "@blueprintjs/core";
import { APIIsAlive } from "@portal/api/general";
import isElectron from "is-electron";
import {
  CreateGenericToast,
  ClearAllGenericToast,
} from "@portal/utils/ui/toasts";

interface RunTimeProps {
  isConnected: boolean;
  callbacks: {
    HandleHasCache: (hasCache: boolean) => void;
    HandleIsConnected: (isConnected: boolean) => void;
  };
}

/**
 * This function sends and checks for an acitve server app
 *
 * @returns {JSX.Element}
 */
// eslint-disable-next-line import/prefer-default-export
export function RuntimeChecker(props: RunTimeProps): JSX.Element {
  const [isRestart, setIsRestart] = useState(false);
  const threshold = 1;
  let heartbeatCounts = 0;

  const checkForHeartbeat = () => {
    APIIsAlive()
      .then(result => {
        const askForCache = result.data.hasCache && !result.data.isCacheCalled;
        props.callbacks.HandleHasCache(askForCache);
        if (!props.isConnected) props.callbacks.HandleIsConnected(true);
        heartbeatCounts = 0;
        if (isRestart) setIsRestart(false);
      })
      .catch(() => {
        if (heartbeatCounts < threshold) {
          const message = "Waiting for runtime to load";
          const icon = (
            <>
              <Spinner size={SpinnerSize.SMALL} className={"bp3-icon"} />
            </>
          );
          CreateGenericToast(message, Intent.PRIMARY, 25000, icon);
        } else if (isElectron()) {
          const message = "Portal runtime is unresponsive.";
          const icon = "outdated";
          const action = {
            onClick: () => {
              setIsRestart(true);
              ClearAllGenericToast();
              const { ipcRenderer } = window.require("electron");
              ipcRenderer.send("restart-server");
            },
            text: "Restart?",
          };
          CreateGenericToast(message, Intent.WARNING, 25000, icon, action);
        } else {
          const message =
            "Portal runtime is unresponsive. Please restart the server.";

          const icon = "outdated";
          CreateGenericToast(message, Intent.WARNING, 25000, icon);
        }
        heartbeatCounts += 1;
        if (props.isConnected) props.callbacks.HandleIsConnected(false);
      });
  };

  useEffect(() => {
    checkForHeartbeat();
    const interval = setInterval(checkForHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [isRestart]);

  return <></>;
}
