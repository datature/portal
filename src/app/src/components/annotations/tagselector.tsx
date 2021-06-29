import React from "react";
import { Button, TagInput } from "@blueprintjs/core";

interface TagSelectorProps {
  useDarkTheme: boolean;
  showSelected: boolean;
  filterArr: Array<string>;
  callbacks: {
    ToggleShowSelected: () => void;
    SetFilterArr: (values: any) => void;
  };
}

export default class TagSelector extends React.Component<TagSelectorProps> {
  constructor(props: TagSelectorProps) {
    super(props);
  }

  render(): JSX.Element {
    const showSelectedButton = (
      <Button
        icon={this.props.showSelected ? "eye-open" : "eye-off"}
        onClick={this.props.callbacks.ToggleShowSelected}
      />
    );

    return (
      <>
        <TagInput
          className={this.props.useDarkTheme ? "bp3-dark" : ""}
          rightElement={showSelectedButton}
          values={this.props.filterArr}
          placeholder="Enter filters here..."
          onChange={this.props.callbacks.SetFilterArr}
        />
      </>
    );
  }
}
