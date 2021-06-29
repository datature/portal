import React from "react";

import { Card, Menu } from "@blueprintjs/core";

import classes from "./sidebar.module.css";

export default class SideBar extends React.Component<{}, {}> {
  render(): JSX.Element {
    return (
      <Card className={classes.ProjectBoardSidebar}>
        <Menu>{this.props.children}</Menu>
      </Card>
    );
  }
}
