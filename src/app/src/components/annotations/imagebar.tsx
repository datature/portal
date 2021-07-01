import React, { Component } from "react";
import {
  Card,
  Tag,
  Icon,
  IconSize,
  Tooltip,
  Position,
} from "@blueprintjs/core";
import { AssetAPIObject } from "@portal/api/annotation";
import VideoThumbnail from "react-video-thumbnail";
import classes from "./imagebar.module.css";

function ThumbnailGenerator(
  asset: AssetAPIObject,
  index: string,
  useDarkTheme: boolean,
  clickCallback: (assetObject: AssetAPIObject) => void,
  currentAssetID: string
): JSX.Element {
  return (
    <Card
      className={["image-bar-thumbnail-card", classes.Card].join(" ")}
      key={index}
      onClick={() => clickCallback(asset)}
    >
      <div
        className={
          asset.assetUrl === currentAssetID
            ? "image-bar-thumbnail image-bar-thumbnail-highlighted"
            : "image-bar-thumbnail"
        }
      >
        {asset.type === "video" ? (
          <>
            {" "}
            <Icon
              className={classes.StackTop}
              icon="video"
              iconSize={IconSize.STANDARD}
            />
            <div>
              <VideoThumbnail
                width={150}
                length={150}
                snapshotAtTime={1}
                videoUrl={asset.thumbnailUrl}
              />
            </div>
          </>
        ) : (
          <img src={asset.thumbnailUrl} alt={asset.filename} />
        )}

        <Tag
          className={["image-bar-filename-tag", classes.Tag].join(" ")}
          fill={true}
          style={{ backgroundColor: useDarkTheme ? "" : "#CED9E0" }}
          rightIcon={
            asset.isCached ? (
              <Tooltip
                content="Inference is Cached by Model"
                position={Position.TOP}
              >
                <Icon
                  icon="bookmark"
                  color={useDarkTheme ? "#0F9960" : "#3DCC91"}
                />
              </Tooltip>
            ) : (
              false
            )
          }
        >
          <span
            className={"bp3-ui-text bp3-monospace-text image-bar-filename-text"}
          >
            {asset.filename}
          </span>
        </Tag>
      </div>
    </Card>
  );
}

interface ImageBarProps {
  assetList: Array<AssetAPIObject>;
  useDarkTheme: boolean;
  /* Callbacks Package */
  callbacks: any;
}

export default class ImageBar extends Component<ImageBarProps> {
  private currentAssetID: string;

  constructor(props: ImageBarProps) {
    super(props);
    this.currentAssetID = "";
    this.highlightAsset = this.highlightAsset.bind(this);
  }

  highlightAsset(assetUrl: string): void {
    this.currentAssetID = assetUrl;
    this.forceUpdate();
  }

  render(): JSX.Element {
    return (
      <>
        {this.props.assetList.map(object => {
          return ThumbnailGenerator(
            object,
            object.assetUrl,
            this.props.useDarkTheme,
            this.props.callbacks.selectAssetCallback,
            this.currentAssetID
          );
        })}
      </>
    );
  }
}
