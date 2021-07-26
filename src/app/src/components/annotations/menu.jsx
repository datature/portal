/* eslint-disable no-unused-vars */
/* eslint-disable react/jsx-curly-newline */
/* eslint-disable react/jsx-wrap-multilines */
/* eslint-disable no-underscore-dangle */
import React, { Component } from "react";
import {
  Tag,
  Menu,
  MenuDivider,
  MenuItem,
  KeyCombo,
  Tab,
  Tabs,
  Icon,
  Spinner,
  Slider,
  FormGroup,
  InputGroup,
  TagInput,
  Button,
  Tooltip,
  Position,
  ControlGroup,
  IconSize,
} from "@blueprintjs/core";

import { TagColours } from "@portal/constants/annotation";

import { isEmpty } from "lodash";

import classes from "./menu.module.css";

import TagSelector from "./tagselector";

/* Tags Settings */
const TagStates = {
  fill: true,
  minimal: true,
  round: false,
  interactive: true,
  className: "annotator-tags",
};

/* Tag Generator */
function TagGenerator(idx, tagid) {
  const tagStyle = {
    backgroundColor: TagColours[tagid % TagColours.length],
    fontSize: "12px",
    display: "inline-block",
    borderRadius: "3px",
    textAlign: "center",
    padding: "2px",
    width: "15px",
    height: "8px",
  };

  return <div style={tagStyle} />;
}

export default class AnnotationMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedTag: 0,
      selectedAnnotationID: "",
      annotations: [],
    };

    /**
     * Map between tagID and the index it is displayed as
     * Helps to maintain consistency between tagList and annotationList
     */
    this.tagIDtoDisplayIndex = {};

    /**
     * Map between tagID and tag name
     */
    this.tagNames = {};

    /* Collection of DOM refs for scrollIntoView */
    this.annotationRefs = {};

    /* Total number of annotations of each tag ID */
    this.tagCount = {};
    /* Number of hidden annotations of each tag ID */
    this.hiddenTagCount = {};

    this.setAnnotationTag = this.setAnnotationTag.bind(this);
  }

  /**
   *
   * @param {*} annotationGroup - FeatureGroup of annotations
   */
  setAnnotations(annotationGroup) {
    const annotationArray = Object.values(annotationGroup._layers);

    /* Sort by Tag number, and then annotation ID */
    annotationArray.sort((a, b) => {
      const tagDiff =
        this.tagIDtoDisplayIndex[a.options.annotationTag] -
        this.tagIDtoDisplayIndex[b.options.annotationTag];
      if (tagDiff !== 0) return tagDiff;
      if (a.options.annotationID < b.options.annotationID) return -1;
      if (a.options.annotationID > b.options.annotationID) return 1;
      return 0;
    });

    /**
     * - Initialize refs for each annotationID
     * - Update tag count
     */
    this.annotationRefs = {};
    this.tagCount = {};
    annotationArray.forEach(annotation => {
      this.annotationRefs[annotation.options.annotationID] = React.createRef();
      this.tagCount[annotation.options.annotationTag] =
        (this.tagCount[annotation.options.annotationTag] || 0) + 1;
    });

    /**
     * Store annotation together with display counter
     */
    const annotations = annotationArray.reduce((arr, annotation, idx) => {
      if (
        idx === 0 ||
        annotation.options.annotationTag !==
          annotationArray[idx - 1].options.annotationTag
      ) {
        /* If new tag, reset counter */
        arr.push([annotation, 1]);
      } else {
        /* Increment counter of previous */
        arr.push([annotation, arr[idx - 1][1] + 1]);
      }
      return arr;
    }, []);

    this.setState({
      annotations,
    });
  }

  setAnnotationTag(idx) {
    this.setState({
      selectedTag: idx,
    });
    this.props.callbacks.SetAnnotationTag(idx);
  }

  setSelectedAnnotation(annotation) {
    /* If annotation is null, set to empty string */
    if (annotation === null) {
      this.setState({ selectedAnnotationID: "" });
      return;
    }

    this.setState({
      selectedAnnotationID: annotation.options.annotationID,
    });
    /* Scroll to selected annotation */
    this.annotationRefs[
      annotation.options.annotationID
    ].current.scrollIntoView({ block: "nearest" });
  }

  /**
   * Icon for hiding all annotations a certain tagID
   * @param {*} tagID
   */
  generateTagHideIcon(tagID) {
    /**
     * If number of hidden annotations = number of annotations of
     * that tag type, that tag is currently hidden
     */
    const isVisible =
      !(tagID in this.tagCount) ||
      this.hiddenTagCount[tagID] !== this.tagCount[tagID];

    return (
      <Icon
        icon={isVisible ? "eye-open" : "eye-off"}
        className={classes.SpacedIcon}
        onClick={e => {
          /* Prevent Click Propagation to Tag */
          e.stopPropagation();
          /* Hide or show all annotations with current tagID */
          this.props.callbacks.SetAnnotationVisibility(
            !isVisible, // Hide if currently visible, else show
            ...this.state.annotations
              .map(entry => entry[0])
              .filter(annotation => annotation.options.annotationTag === tagID)
          );
        }}
      />
    );
  }

  /**
   * Icon for hiding a single annotation
   * @param {*} annotation - target annotation
   */
  generateAnnotationHideIcon(annotation) {
    /* Search hiddenAnnotations for annotation ID */
    const isVisible = !this.props.hiddenAnnotations.has(
      annotation.options.annotationID
    );
    return (
      <Icon
        icon={isVisible ? "eye-open" : "eye-off"}
        onClick={e => {
          /* Prevent Click Propagation to Tag */
          e.stopPropagation();
          /* Hide annotation if currently visible, else show */
          this.props.callbacks.SetAnnotationVisibility(!isVisible, annotation);
        }}
      />
    );
  }

  /**
   * Count and update number of hidden annotations of each tag ID
   * to allow for checking if each tag is hidden
   */
  updateHiddenTagCount() {
    this.hiddenTagCount = {};
    this.state.annotations.forEach(entry => {
      if (this.props.hiddenAnnotations.has(entry[0].options.annotationID)) {
        const tag = entry[0].options.annotationTag;
        this.hiddenTagCount[tag] = (this.hiddenTagCount[tag] || 0) + 1;
      }
    });
  }

  render() {
    this.updateHiddenTagCount();
    /**
     * List of tags to be displayed under Tags tab
     */
    const tagList = (
      <div className={["tag-list", classes.TagList].join(" ")}>
        {Object.entries(this.props.projectTags)
          .filter(
            ([tag, _]) =>
              /* If no filters selected, should return true. This is to
              guard against some returning false on empty arrays */
              this.props.filterArr.length === 0 ||
              /* Check if tag is present in filter (CASE-INSENSITIVE) */
              this.props.filterArr.some(
                filter => tag.toLowerCase() === filter.toLowerCase()
              ) === this.props.showSelected
          )
          /* Update mapping */
          .map(([tagname, tagid], idx) => {
            this.tagIDtoDisplayIndex[tagid] = idx;
            this.tagNames[tagid] = tagname;
            return (
              <Tag
                className={classes.MenuTag}
                key={tagid}
                {...TagStates}
                active={idx === this.state.selectedTag}
                rightIcon={
                  <div>
                    {this.generateTagHideIcon(tagid)}
                    {TagGenerator(idx, tagid)}
                  </div>
                }
                onClick={() => {
                  this.setAnnotationTag(idx);
                }}
              >
                {tagname}
              </Tag>
            );
          })}
      </div>
    );

    /**
     * List of annotations to be displayed under Annotations tab
     */
    const annotationList = (
      <div className={["tag-list", classes.TagList].join(" ")}>
        {this.state.annotations
          .filter(
            ([annotation, _]) =>
              annotation.options.confidence > this.props.confidence &&
              /* If no filters selected, should return true. This is to
              guard against some returning false on empty arrays */
              (this.props.filterArr.length === 0 ||
                /* Check if tag is present in filter (CASE-INSENSITIVE) */
                this.props.showSelected ===
                  this.props.filterArr.some(filter =>
                    this.tagNames[annotation.options.annotationTag]
                      .toLowerCase()
                      .includes(filter.toLowerCase())
                  ))
          )
          .map(([annotation, displayCounter]) => (
            <Tag
              className={classes.MenuTag}
              key={
                /* shortened annotation id */
                annotation.options.annotationID.split("-")[0]
              }
              elementRef={this.annotationRefs[annotation.options.annotationID]}
              {...TagStates}
              active={
                annotation.options.annotationID ===
                this.state.selectedAnnotationID
              }
              rightIcon={
                /* Hide/unhide icon */
                <div>{this.generateAnnotationHideIcon(annotation)}</div>
              }
              onClick={async () => {
                /**
                 * Click on the annotation on the image
                 * Annotator will handle the state change
                 * */
                await this.props.callbacks.SetAnnotationVisibility(
                  true,
                  annotation
                );
                annotation.fire("click");
              }}
            >
              <Icon
                icon={
                  annotation.options.annotationType === "rectangle"
                    ? "widget"
                    : "polygon-filter"
                }
                iconSize={12}
                /* Tag colour coding */
                style={{
                  color:
                    TagColours[
                      annotation.options.annotationTag % TagColours.length
                    ],
                  marginRight: "5px",
                  marginBottom: "2px",
                }}
              />
              {`${
                this.tagNames[annotation.options.annotationTag]
              } ${displayCounter}`}
            </Tag>
          ))}
      </div>
    );

    return (
      <>
        <Menu className={"main-menu bp3-elevation-1"}>
          <MenuItem icon={"graph"} text="Annotator Controls" />
          <MenuDivider title="Assets Folder" />
          {this.props.isSyncing ? (
            <Spinner size={30} className={classes.Spin} />
          ) : (
            <>
              <MenuItem
                icon="folder-new"
                text="Open Folder"
                label={<KeyCombo combo="O" />}
                onClick={this.props.callbacks.OpenFileManagement}
              />
              <MenuItem
                icon="repeat"
                text="Sync All Folders"
                label={<KeyCombo combo="S" />}
                onClick={this.props.callbacks.SyncAllFolders}
              />
            </>
          )}
          <MenuDivider title="Inference" />

          {this.props.predictDone === 0 ? (
            <Tooltip
              content="Load Model and Image before analysing"
              position={Position.TOP}
              disabled={
                this.props.isConnected &&
                this.props.loadedModel &&
                !isEmpty(this.props.assetList)
              }
            >
              <div className={classes.InferenceMenuItem}>
                <MenuItem
                  disabled={
                    !this.props.isConnected ||
                    !this.props.loadedModel ||
                    isEmpty(this.props.currentAsset)
                  }
                  icon="ring"
                  text="Analyze"
                  label={<KeyCombo combo="A" />}
                  className={
                    this.props.userEditState === "Re-Analyse"
                      ? "bp3-active"
                      : ""
                  }
                  onClick={() => this.props.callbacks.SingleAnalysis()}
                />
                <MenuItem
                  disabled={
                    !this.props.isConnected ||
                    !this.props.loadedModel ||
                    isEmpty(this.props.assetList)
                  }
                  icon="heat-grid"
                  text="Bulk Analysis"
                  label={<KeyCombo combo="B" />}
                  className={
                    this.props.userEditState === "Bulk Analysis"
                      ? "bp3-active"
                      : ""
                  }
                  onClick={this.props.callbacks.BulkAnalysis}
                />
              </div>
            </Tooltip>
          ) : (
            <Spinner size={30} className={classes.Spin} />
          )}
          <MenuDivider title="Confidence Threshold" />
          <Slider
            className={classes.Slider}
            min={0}
            max={100}
            onChange={this.props.callbacks.ToggleConfidence}
            stepSize={1}
            labelStepSize={100}
            value={this.props.confidence * 100}
            vertical={false}
          />
          <MenuDivider />
          <MenuItem
            icon="new-text-box"
            text="Advanced Settings"
            onClick={this.props.callbacks.OpenAdvancedSettings}
          />
          <MenuDivider title="Filter Tags" />
          <TagSelector
            showSelected={this.state.showSelected}
            filterArr={this.state.filterArr}
            callbacks={{
              SetFilterArr: this.setFilterArr,
              ToggleShowSelected: this.toggleShowSelected,
            }}
            {...this.props}
          />
          <MenuDivider />
          <Tabs className={classes.SelectionList}>
            <Tab
              id="annotation-objects"
              title="Objects"
              panel={annotationList}
            />
            <Tab id="project-tags" title="Tag Map" panel={tagList} />
          </Tabs>
        </Menu>
      </>
    );
  }
}
