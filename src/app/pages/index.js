import React from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

/* UI Imports */
import { Classes } from "@blueprintjs/core";
import { setConfiguration } from "react-grid-system";
import HeaderNav from "@portal/components/ui/header/navbar";

/* Global Setting / Styling */
const THEME_LOCAL_STORAGE_KEY = "nexus-theme";

/* CSR Annotator Loading */
const AnnotatorDynamic = dynamic(
  () => import("@portal/components/annotations/annotator.tsx"),
  {
    ssr: false,
  }
);

class Annotation extends React.Component {
  constructor(props) {
    super(props);

    /* Global Setting / Styling State */
    this.state = {
      useDarkTheme: false,
      loadedModel: undefined,
    };

    /* Grid Layout Configuration */
    setConfiguration({ gutterWidth: 12 });
    this.setTheme = this.setTheme.bind(this);
  }

  componentDidMount() {
    const theme = localStorage.getItem(THEME_LOCAL_STORAGE_KEY);
    this.setState({
      useDarkTheme: theme == null ? false : theme === "true",
    });
  }

  setTheme(flag) {
    localStorage.setItem(THEME_LOCAL_STORAGE_KEY, flag);
    this.setState({
      useDarkTheme: flag,
    });
  }

  render() {
    return (
      <>
        <Head>
          <title>Annotator</title>
          <link rel="icon" type="image/x-icon" href="./favicon.ico" />
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
          />
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.3/leaflet.draw.css"
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
        </Head>
        {/* Page Theme Class / Styling */}
        <div className={this.state.useDarkTheme ? Classes.DARK : ""}>
          <HeaderNav
            active={"Annotations"}
            useDarkTheme={this.state.useDarkTheme}
            GlobalSetting={this.state}
            GlobalSettingCallback={this.setTheme}
            {...this.props}
            handleModelChange={loadedModel => {
              this.setState({ loadedModel });
            }}
          />

          {/* Main Content Area */}
          <AnnotatorDynamic
            project={this.props.projectID}
            {...this.props}
            {...this.state}
          />
        </div>
      </>
    );
  }
}

/**
 * Annotator Page ONLY Accepts Project ID as Route Parameter
 * TODO : Verify Ownership / Accessbility to ProjectID
 */
const AnnotatorPage = props => {
  const project = "906969446527476eefc2d2062897f92d";
  /* Render Annotation Class */
  return <Annotation projectID={project} {...props} />;
};

export default AnnotatorPage;
