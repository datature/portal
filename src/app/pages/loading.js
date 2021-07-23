import React from "react";
import Head from "next/head";

/* UI Imports */
import { Classes, Spinner } from "@blueprintjs/core";
import { setConfiguration } from "react-grid-system";

/* Global Setting / Styling */
const THEME_LOCAL_STORAGE_KEY = "nexus-theme";

class Loading extends React.Component {
  constructor(props) {
    super(props);

    /* Global Setting / Styling State */
    this.state = {
      useDarkTheme: false,
    };

    /* Grid Layout Configuration */
    setConfiguration({ gutterWidth: 12 });
  }

  componentDidMount() {
    const theme = localStorage.getItem(THEME_LOCAL_STORAGE_KEY);
    this.setState({
      useDarkTheme: theme == null ? false : theme === "true",
    });
  }

  render() {
    return (
      <>
        <Head>
          <title>Loading</title>
          <link rel="icon" type="image/x-icon" href="./portal-ico-dark.png"
            media="(prefers-color-scheme:dark)" />
          <link rel="icon" type="image/x-icon" href="./portal-ico-light.png"
            media="(prefers-color-scheme:light)" />
          <link href="./static/style/annotation.css" rel="stylesheet" />
          <link
            href={
              this.state.useDarkTheme
                ? "./static/style/global-dark.css"
                : "./static/style/global-light.css"
            }
            rel="stylesheet"
          />
        </Head>
        {/* Page Theme Class / Styling */}
        <div
          className={this.state.useDarkTheme ? Classes.DARK : ""}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "absolute",
            width: "100%",
            height: "100%",
          }}
        >
          <Spinner style={{ margin: "0 auto", position: "relative" }} />
        </div>
      </>
    );
  }
}

export default Loading;
