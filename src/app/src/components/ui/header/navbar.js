import * as React from "react";
import Router from "next/router";
import { APILoadCache, APIRejectCache } from "@portal/api/general";

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
      urlPath: "",
      hasCache: false,
      isAPICalled: false,
    };
  }

  handleLoadCache = async () => {
    this.setState({ isAPICalled: true });
    await APILoadCache()
      .then(() => {
        this.setState({ hasCache: false });
        window.location.reload(false);
      })
      .catch(error => {
        let message = `Failed to load cache. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
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
        let message = `Failed to reject cache. ${error}`;
        if (error.response) {
          message = `${error.response.data.error}: ${error.response.data.message}`;
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
              icon={<NexusDarkLogo />}
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
              {...this.props}
              callbacks={{ HandleModelChange: this.props.handleModelChange }}
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
              content={<QuickSetting {...this.props} />}
            >
              <Button icon="cog" className={"bp3-button bp3-minimal"} />
            </Popover>
            <Button icon="notifications" className={"bp3-button bp3-minimal"} />
          </NavbarGroup>
        </Navbar>
        <RuntimeChecker
          isConnected={this.props.isConnected}
          callbacks={{
            HandleHasCache: hasCache => {
              this.setState({ hasCache });
            },
            HandleIsConnected: this.props.handleIsConnected,
          }}
        />
        <Alert
          isOpen={this.state.hasCache}
          intent={Intent.PRIMARY}
          icon="history"
          loading={this.state.isAPICalled}
          onCancel={this.handleRejectCache}
          onConfirm={this.handleLoadCache}
          cancelButtonText={"No"}
          confirmButtonText={"Yes"}
          className={this.props.useDarkTheme ? "bp3-dark" : ""}
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

const NexusDarkLogo = () => {
  return <img src="./static/img/portal-icon.png" alt="logo" height="24px" />;
};
