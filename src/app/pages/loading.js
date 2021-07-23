import React from "react";
import Head from "next/head";

/* UI Imports */
import { Classes, Spinner, H6 } from "@blueprintjs/core";
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
          <link
            rel="icon"
            type="image/x-icon"
            href="./portal-ico-dark.png"
            media="(prefers-color-scheme:dark)"
          />
          <link
            rel="icon"
            type="image/x-icon"
            href="./portal-ico-light.png"
            media="(prefers-color-scheme:light)"
          />
          <link href="./static/style/annotation.css" rel="stylesheet" />
          <link
            href={
              this.state.useDarkTheme
                ? "./static/style/global-dark.css"
                : "./static/style/global-light.css"
            }
            rel="stylesheet"
          />
          <style>
            {`
             .nexus-icon {
                position: absolute;
                margin-top: -50px;
                margin-left: -50px;
                top: 50%;
                left: 50%;
                cursor: pointer;
                animation: shadow-pulse 2.5s infinite;
             }

             .typewriter h6 {
              size: 14px;
              color: #8B9CA9;
              font-family: monospace;
              overflow: hidden; /* Ensures the content is not revealed until the animation */
              border-right: .15em solid #8A9BA8; /* The typwriter cursor */
              white-space: nowrap; /* Keeps the content on a single line */
              margin: 0 auto; /* Gives that scrolling effect as the typing happens */
              letter-spacing: .05em; /* Adjust as needed */
              animation: 
                typing 1.5s steps(30, end),
                blink-caret .7s step-end infinite;
            }

            .server-versioning {
              position : fixed;
              color : #5A6B78;
              right : 20px;
              bottom : 0px;
            }
            
            /* The typing effect */
            @keyframes typing {
              from { width: 0 }
              to { width: 100% }
            }
            
            /* The typewriter cursor effect */
            @keyframes blink-caret {
              from, to { border-color: transparent }
              50% { border-color: #8A9BA8 }
            }

             @keyframes shadow-pulse
              {
                0% {
                  box-shadow: 0 0 0 0px rgba(0, 0, 0, 0.2);
                }
                100% {
                  box-shadow: 0 0 0 35px rgba(0, 0, 0, 0);
                }
              }
          `}
          </style>
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
          <Spinner
            style={{ margin: "0 auto", position: "relative", display: "block" }}
            size={18}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "absolute",
            top: "36px",
            width: "100%",
            height: "100%",
            color: "white",
          }}
        >
          <div className={"typewriter"} style={{ paddingLeft: "0.15em" }}>
            <H6>{">"} Initializing Portal Engine ..</H6>
          </div>
        </div>
      </>
    );
  }
}

export default Loading;
