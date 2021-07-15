import React, { useEffect, useState } from "react";
import { Intent, Spinner } from "@blueprintjs/core";
import { APIIsAlive } from "@portal/api/general";
import isElectron from "is-electron";
import {
  CreateGenericToast,
  ClearAllGenericToast,
  DissmissToast,
} from "@portal/utils/ui/toasts";

interface RunTimeProps {
  isConnected: boolean;
  callbacks: {
    HandleHasCache: (hasCache: boolean) => void;
    HandleIsConnected: (isConnected: boolean) => void;
    HandleElectronGPUListener: () => void;
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
  let heartbeatCounts = 0;
  let connectedOnce = false;
  const threshold = 1;
  let toastKey: string | undefined;
  let { isConnected } = props;

  const checkForHeartbeat = () => {
    APIIsAlive()
      .then(result => {
        const askForCache = result.data.hasCache && !result.data.isCacheCalled;
        props.callbacks.HandleHasCache(askForCache);
        if (!isConnected) {
          props.callbacks.HandleIsConnected(true);
          isConnected = true;
          props.callbacks.HandleElectronGPUListener();
        }
        if (toastKey) DissmissToast(toastKey);
        if (!connectedOnce) connectedOnce = true;
        heartbeatCounts = 0;
        if (isRestart) setIsRestart(false);
      })
      .catch(() => {
        if (connectedOnce && !isElectron()) {
          const message = "Portal runtime is unresponsive. Restart server.";
          const icon = "outdated";
          if (toastKey) DissmissToast(toastKey);
          CreateGenericToast(message, Intent.WARNING, 25000, icon);
        } else if (heartbeatCounts === 0) {
          const message = "Waiting for runtime to load";
          const icon = (
            <>
              <Spinner size={15} className={"bp3-icon"} />
            </>
          );
          toastKey = CreateGenericToast(message, Intent.PRIMARY, 0, icon);
        } else if (heartbeatCounts >= threshold && isElectron()) {
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
          if (toastKey) DissmissToast(toastKey);
          CreateGenericToast(message, Intent.WARNING, 25000, icon, action);
        }
        heartbeatCounts += 1;
        if (props.isConnected) {
          props.callbacks.HandleIsConnected(false);
          isConnected = false;
        }
      });
  };

  useEffect(() => {
    checkForHeartbeat();
    const interval = setInterval(checkForHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [isRestart]);

  return <></>;
}
