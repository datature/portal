import * as React from "react";
import Router from "next/router";
import {
  APILoadCache,
  APIRejectCache,
  APIClearGPU,
  APISetGPU,
  APIGetGPU,
  APIShutdown,
} from "@portal/api/general";

import {
  Classes,
  AnchorButton,
  Alignment,
  Button,
  Navbar,
  NavbarGroup,
  Popover,
  Intent,
  Alert,
} from "@blueprintjs/core";

import { CreateGenericToast } from "@portal/utils/ui/toasts";
import Model from "@portal/components/annotations/model";
import { RuntimeChecker } from "@portal/utils/runtime";
import isElectron from "is-electron";
import QuickSetting from "./settings";

// import classes from "./navbar.module.css";

/**
 * Header Navigation for Portal
 * Props : Disabled Button, Loading and Active State
 */
export default class HeaderNav extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isChangingProcessor: false,
      changeProcessor: false,
      urlPath: "",
      hasCache: false,
      isAPICalled: false,
    };
  }

  componentDidMount = () => {
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.on("restart-server-reply", this.handleElectronGPUListener);
    }
  };

  componentWillUnmount = () => {
    if (isElectron()) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.removeListener(
        "restart-server-reply",
        this.handleElectronGPUListener
      );
    }
  };

  handleElectronGPUListener = async () => {
    await APIGetGPU().then(res => {
      if (res.data === 0) {
        this.props.GlobalSettingCallback.setGPU(true);
      } else {
        this.props.GlobalSettingCallback.setGPU(false);
      }
    });
    this.setState({
      isChangingProcessor: false,
      changeProcessor: false,
    });
  };

  openProcessorAlert = () => {
    this.setState({
      changeProcessor: true,
    });
  };

  handleChangeProcessor = async () => {
    this.setState({ isChangingProcessor: true });

    if (this.props.GlobalSetting.isGPU) {
      await APIClearGPU().catch(error => {
        let message = "Failed to clear gpu";
        if (error.response) {
          message = `${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    } else {
      await APISetGPU().catch(error => {
        let message = "Failed to set gpu";
        if (error.response) {
          message = `${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    }
    await APIShutdown();
    const { ipcRenderer } = window.require("electron");
    ipcRenderer.send("restart-server");
  };

  handleLoadCache = async () => {
    this.setState({ isAPICalled: true });
    await APILoadCache()
      .then(() => {
        this.setState({ hasCache: false });
        window.location.reload(false);
      })
      .catch(error => {
        let message = "Failed to load cache.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isAPICalled: false });
  };

  handleRejectCache = async () => {
    this.setState({ isAPICalled: true });
    await APIRejectCache()
      .then(() => {
        this.setState({ hasCache: false });
      })
      .catch(error => {
        let message = "Failed to reject cache.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }

        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isAPICalled: false });
  };

  isProjectBoard = () => {
    const url = this.state.urlPath.split("/");
    return url[1] === "project";
  };

  render() {
    return (
      <>
        <Navbar>
          <NavbarGroup align={Alignment.LEFT}>
            <AnchorButton
              icon={
                this.props.GlobalSetting.useDarkTheme ? (
                  <DarkLogo />
                ) : (
                  <LightLogo />
                )
              }
              minimal={true}
              onClick={() => {
                Router.push({ pathname: "/" });
              }}
            />
            <span className="bp3-navbar-divider" />
          </NavbarGroup>
          <NavbarGroup align={Alignment.RIGHT}>
            <span className="bp3-navbar-divider" />
            <Model
              {...this.props.GlobalSetting}
              callbacks={{
                HandleModelChange: this.props.GlobalSettingCallback
                  .handleModelChange,
              }}
            />
            <span className="bp3-navbar-divider" />
            <Button
              style={{ userSelect: "none", minWidth: "max-content" }}
              className={"bp3-button bp3-minimal"}
              onClick={() => {
                window.location =
                  "https://joindatature.slack.com/join/shared_invite/zt-hv9xv84h-WYDFnU1clNM0eGW4SfQGGg#/";
              }}
            >
              Community Slack
            </Button>
            <span className="bp3-navbar-divider" />
            <Popover
              popoverClassName={Classes.POPOVER_CONTENT_SIZING}
              forceFocus={false}
              position={"bottom-right"}
              content={
                // eslint-disable-next-line react/jsx-wrap-multilines
                <QuickSetting
                  {...this.props}
                  callbacks={{ OpenProcessorAlert: this.openProcessorAlert }}
                />
              }
            >
              <Button icon="cog" className={"bp3-button bp3-minimal"} />
            </Popover>
          </NavbarGroup>
        </Navbar>
        <RuntimeChecker
          isConnected={this.props.GlobalSetting.isConnected}
          callbacks={{
            HandleHasCache: hasCache => {
              this.setState({ hasCache });
            },
            HandleIsConnected: this.props.GlobalSettingCallback
              .handleIsConnected,
            HandleElectronGPUListener: this.handleElectronGPUListener,
          }}
        />
        <Alert
          isOpen={this.state.changeProcessor}
          intent={Intent.PRIMARY}
          icon="warning-sign"
          loading={this.state.isChangingProcessor}
          onCancel={() => this.setState({ changeProcessor: false })}
          onConfirm={this.handleChangeProcessor}
          cancelButtonText={"No"}
          confirmButtonText={"Yes"}
          className={this.props.GlobalSetting.useDarkTheme ? "bp3-dark" : ""}
        >
          <div>
            To change the processor to{" "}
            {this.props.GlobalSetting.isGPU ? "CPU" : "GPU"}. The server has to
            restart. Do you wish to continue?
          </div>
        </Alert>
        <Alert
          isOpen={this.state.hasCache}
          intent={Intent.PRIMARY}
          icon="history"
          loading={this.state.isAPICalled}
          onCancel={this.handleRejectCache}
          onConfirm={this.handleLoadCache}
          cancelButtonText={"No"}
          confirmButtonText={"Yes"}
          className={this.props.GlobalSetting.useDarkTheme ? "bp3-dark" : ""}
        >
          <div>
            Unsaved session found. Would you like to resume from the previous
            session?
          </div>
        </Alert>
      </>
    );
  }
}

/**
 * This intercom renderer decides when to render or hide Intercom's Button
 * @todo - Move this to utils
 */

const DarkLogo = () => {
  return <img src="./static/img/portal-icon-dm.png" alt="logo" height="24px" />;
};

const LightLogo = () => {
  return <img src="./static/img/portal-icon-lm.png" alt="logo" height="24px" />;
};
