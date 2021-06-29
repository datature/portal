import React from "react";
import { Card, ProgressBar } from "@blueprintjs/core";
import classes from "./popupwindow.module.css";

const PopUpWindow = (props: any): React.ReactElement => {
  return (
    <div className={classes.predictionDisplay}>
      <Card
        className={`${props.useDarkTheme ? "bp3-dark" : " "} ${
          classes.predictionText
        }`}
      >
        <b>Querying Inference Model</b>
      </Card>
      <ProgressBar intent={"primary"} className={classes.predictionSpinner} />
    </div>
  );
};

export default PopUpWindow;
