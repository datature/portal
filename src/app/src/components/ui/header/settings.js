import * as React from "react";
import { FormGroup, Position, Switch, Tooltip } from "@blueprintjs/core";
import isElectron from "is-electron";

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
              this.props.GlobalSettingCallback.setTheme(event.target.checked);
            }}
          />
        </FormGroup>
        <FormGroup label={<b>Proccessor</b>}>
          <Tooltip
            disabled={isElectron()}
            content={
              this.props.GlobalSetting.isGPU
                ? "Exclude the --gpu flag to run in cpu mode"
                : "Add the --gpu flag to run the server on GPU"
            }
            position={Position.BOTTOM}
          >
            <Switch
              disabled={!isElectron()}
              label={"Run on GPU"}
              checked={this.props.GlobalSetting.isGPU}
              onChange={event => {
                this.props.callbacks.OpenProcessorAlert(event.target.checked);
              }}
            />
          </Tooltip>
        </FormGroup>
        <FormGroup label={<b>Autosave</b>}>
          <Switch
            label={"Autosave Progress"}
            checked={this.props.GlobalSetting.isAutosave}
            onChange={event => {
              this.props.GlobalSettingCallback.setAutosave(
                event.target.checked
              );
            }}
          />
        </FormGroup>
      </>
    );
  }
}
