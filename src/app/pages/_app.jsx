import React from "react";

// eslint-disable-next-line import/no-extraneous-dependencies
import "normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

function Nexus({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default Nexus;
