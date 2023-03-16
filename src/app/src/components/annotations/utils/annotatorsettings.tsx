import React, { Component } from "react";
import {
  H5,
  Slider,
  Button,
  Label,
  Popover,
  PopoverPosition,
  PopoverInteractionKind,
  Switch,
  Classes,
  Divider,
} from "@blueprintjs/core";

interface AnnotationOptions {
  isOutlined: boolean;
  opacity: number;
}

interface ImageSettingsProps {
  annotationOptions: AnnotationOptions;
  analyticsMode: boolean;
  callbacks: {
    setAnnotatedAssetsHidden: (flag: boolean) => void;
    setAnnotationOptions: (newOption: boolean | number) => void;
    setAnalyticsMode: (flag: boolean) => void;
  };
}

interface ImageSettingsState {
  brightness: number;
  contrast: number;
  saturate: number;
  onlyUnannotatedShown: boolean;
}

export default class AnnotatorSettings extends Component<
  ImageSettingsProps,
  ImageSettingsState
> {
  /* Image to be targeted */
  constructor(props: ImageSettingsProps) {
    super(props);
    this.state = {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      onlyUnannotatedShown: false,
    };

    /* Initialize filters */
    this.getImageElement().style.filter =
      "brightness(100%) contrast(100%) saturate(100%)";
  }

  /**
   * Function to get the current Video or Image element
   * @returns HTML Element that targets the Current Video/ Image
   */
  private getImageElement = (): any => {
    return (
      document.querySelector(
        ".leaflet-pane.leaflet-overlay-pane img.leaflet-image-layer"
      ) ??
      document.querySelector(
        ".leaflet-pane.leaflet-overlay-pane video.leaflet-image-layer"
      )
    );
  };

  /**
   * Set slider state and CSS property value on image element for
   * target filter property
   * @param {Object} params - Properties to be set
   */
  setFilter = (params: {
    filterName: "brightness" | "contrast" | "saturate";
    value: number;
  }): void => {
    /**
     * Since setting multiple filters in css requries a space separated string,
     * we maintain the order "brightness", "contrast", "saturate" so as to correctly
     * change only one value at a time
     */
    const filterString = window.getComputedStyle(this.getImageElement()).filter;
    const entries = filterString.split(" ");
    /* If format invalid, reset to default */
    if (entries.length !== 3) {
      this.resetValues();
      return;
    }

    /* Set respective value, then join back together */
    if (params.filterName === "brightness")
      entries[0] = `brightness(${params.value}%)`;
    else if (params.filterName === "contrast")
      entries[1] = `contrast(${params.value}%)`;
    else entries[2] = `saturate(${params.value}%)`;
    this.getImageElement().style.filter = entries.join(" ");

    this.setState(prevState => {
      const state = { ...prevState };
      state[params.filterName] = params.value;
      return state;
    });
  };

  /**
   * Reset all values to default
   */
  resetValues = (): void => {
    this.getImageElement().style.filter =
      "brightness(100%) contrast(100%) saturate(100%)";
    this.setState({
      brightness: 100,
      contrast: 100,
      saturate: 100,
    });
    this.props.callbacks.setAnnotationOptions(0.45);
    this.props.callbacks.setAnnotationOptions(true);
  };

  render(): JSX.Element {
    return (
      <Popover
        minimal={true}
        interactionKind={PopoverInteractionKind.CLICK}
        position={PopoverPosition.TOP_RIGHT}
        enforceFocus={false}
        className={Classes.POPOVER_CONTENT_SIZING}
      >
        <Button icon="cog" />
        <div className="annotator-settings-card">
          <div className="annotator-settings-content">
            <div className="annotator-settings-col">
              <H5>Annotator Settings</H5>
              <br />
              <Switch
                checked={this.props.annotationOptions.isOutlined}
                onChange={() => {
                  this.props.callbacks.setAnnotationOptions(false);
                }}
              >
                Toggle Annotation Outline
              </Switch>
              <br />
              <Label>
                Annotation Opacity
                <Slider
                  className={"opacity-slider"}
                  min={0}
                  max={1}
                  stepSize={0.01}
                  labelStepSize={1}
                  value={this.props.annotationOptions.opacity}
                  onChange={value => {
                    this.props.callbacks.setAnnotationOptions(value);
                  }}
                />
              </Label>
              <br />
              <Switch
                checked={this.props.analyticsMode}
                onChange={() => {
                  this.props.callbacks.setAnalyticsMode(!this.props.analyticsMode);
                }}
              >
                Toggle Timeline Mode
              </Switch>
            </div>
            <Divider className="annotator-settings-divider" />
            <div className="annotator-settings-col">
              <H5>Image Settings</H5>
              <Label>
                Brightness
                <Slider
                  min={0}
                  max={500}
                  stepSize={1}
                  labelStepSize={500}
                  value={this.state.brightness}
                  onChange={value => {
                    this.setFilter({ filterName: "brightness", value });
                  }}
                />
              </Label>
              <Label>
                Contrast
                <Slider
                  min={0}
                  max={500}
                  stepSize={1}
                  labelStepSize={500}
                  value={this.state.contrast}
                  onChange={value => {
                    this.setFilter({ filterName: "contrast", value });
                  }}
                />
              </Label>
              <Label>
                Saturation
                <Slider
                  min={0}
                  max={500}
                  stepSize={1}
                  labelStepSize={500}
                  value={this.state.saturate}
                  onChange={value => {
                    this.setFilter({ filterName: "saturate", value });
                  }}
                />
              </Label>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Button onClick={this.resetValues}>Reset Defaults</Button>
              </div>
            </div>
          </div>
        </div>
      </Popover>
    );
  }
}
