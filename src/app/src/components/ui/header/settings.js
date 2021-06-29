import * as React from "react";
import { FormGroup, Switch } from "@blueprintjs/core";

export default class QuickSetting extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <>
        <FormGroup label={<b>Interface</b>}>
          <Switch
            label="Dark Mode"
            defaultChecked={this.props.GlobalSetting.useDarkTheme}
            onChange={event => {
              this.props.GlobalSettingCallback(event.target.checked);
            }}
          />
        </FormGroup>
      </>
    );
  }
}
