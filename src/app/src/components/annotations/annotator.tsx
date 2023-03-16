/* eslint-disable react/sort-comp */
/* eslint-disable no-return-assign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-prototype-builtins */
import * as L from "leaflet";
import "leaflet-draw";
import React, { Component } from "react";
import {
  Card,
  HotkeysTarget,
  Hotkey,
  Hotkeys,
  Button,
  ProgressBar,
  Toaster,
  IToastProps,
  Icon,
  Intent,
} from "@blueprintjs/core";

import makeEta from "simple-eta";

import {
  PolylineObjectType,
  RenderAssetAnnotations,
} from "@portal/components/annotations/utils/annotation";

import {
  AssetAPIObject,
  APIGetImageInference,
  APIGetImageData,
  APIGetAsset,
  APIGetVideoInference,
  APIGetModelTags,
  APIGetCacheList,
  APIKillVideoInference,
  APIUpdateAsset,
  APIGetPredictionProgress,
} from "@portal/api/annotation";

import { invert, cloneDeep, isEmpty } from "lodash";

import { CreateGenericToast } from "@portal/utils/ui/toasts";
import AnnotatorInstanceSingleton from "./utils/annotator.singleton";
import AnnotationMenu from "./menu";
import ImageBar from "./imagebar";
import SettingsModal from "./settingsmodal";
import FileModal from "./filemodal";
import AnnotatorSettings from "./utils/annotatorsettings";
import FormatTimerSeconds from "./utils/timer";
import { RegisteredModel } from "./model";
import AnalyticsBar from "./analyticsbar";

type Point = [number, number];
type MapType = L.DrawMap;
type VideoFrameMetadata = {
  presentationTime: DOMHighResTimeStamp;
  expectedDisplayTime: DOMHighResTimeStamp;
  width: number;
  height: number;
  mediaTime: number;
  presentedFrames: number;
  processingDuration: number;

  captureTime: DOMHighResTimeStamp;
  receiveTime: DOMHighResTimeStamp;
  rtpTimestamp: number;
};

/**
 * Enumeration for Existing User Selected Edit Mode
 */
type EditState = "None" | "Open Folder" | "Re-Analyse" | "Bulk Analysis";

function Coordinate(x: number, y: number): Point {
  /* Coordinate Space Resolver */

  return [x, y];
}

type UIState = null | "Predicting";

interface AnnotatorProps {
  project: string;
  user: any;
  useDarkTheme: boolean;
  loadedModel: RegisteredModel | undefined;
  isConnected: boolean;
}

interface AnnotatorState {
  analyticsResult: Array<any>;
  analyticsMode: boolean;
  /* Image List for Storing Project Files */
  assetList: Array<AssetAPIObject>;
  /* List of files whose predictions are cached  */
  cacheList: Array<string>;
  /* Tags for Project */
  tagInfo: {
    modelHash: string | undefined;
    tags: { [tag: string]: number } | any;
  };
  /* Changes Made Flag - For Firing Save Button Availability */
  changesMade: boolean;
  /* Current User Editing Mode */
  userEditState: EditState;
  /* File Management Mode */
  fileManagementOpen: boolean;
  /* Tag Management Mode */
  advancedSettingsOpen: boolean;
  /* Image List Collapse Mode */
  imageListCollapsed: boolean;
  /* Hide annotated images in imagebar */
  annotatedAssetsHidden: boolean;
  /* Kill video prediction state */
  killVideoPrediction: boolean;
  /* Sync all folders state */
  isSyncing: boolean;
  /* Set of IDs of hidden annotations */
  hiddenAnnotations: Set<string>;
  /* Is Annotator Predicting? */
  uiState: UIState;
  /* Total number of items and those predicted */
  predictTotal: number;
  predictDone: number;
  multiplier: number;
  /* Confidence */
  confidence: number;
  /* Can't be polyline object type due to confidence attribute */
  currentAssetAnnotations: any;
  /* Filter state to filter out tag labels */
  filterArr: Array<string>;
  /* Boolean to Always Show Label */
  alwaysShowLabel: boolean;
  /* Choose whether to show or hide selected labels */
  showSelected: boolean;
  /* Metadata related to inference */
  inferenceOptions: {
    /* Intersection over Union */
    iou: number;
    cacheResults: boolean;
    bulkAnalysisStatus: string;
    video: {
      /* Frame interval to produce predictions for video */
      frameInterval: number;
    };
  };
  /* Utility to toggle existing annotations */
  annotationOptions: {
    isOutlined: true;
    opacity: number;
  };
  currAnnotationPlaybackId: number;
}

/**
 * Annotations are Leaflet layers with additional
 * editing and options properties
 */
interface AnnotationLayer extends L.Layer {
  editing: any;
  options: any;
}

/**
 * This Annotator class is a super class of the annotator controls, image select
 * as well as the leaflet map for annotation drawing.
 */
@HotkeysTarget
export default class Annotator extends Component<
  AnnotatorProps,
  AnnotatorState
> {
  /* Class Variables */
  public map!: MapType;
  private imageOverlay!: L.ImageOverlay;
  private videoOverlay!: L.VideoOverlay;
  private annotationGroup!: L.FeatureGroup;

  /* Project Properties */
  private project: string;

  /* Component Reference */
  private imagebarRef: any;

  /* Annotation Operations Variables */
  public currentAsset: AssetAPIObject;
  /**
   * Current Tag is read on SetAnnotationTag. this is an unwanted side-effect but
   * Is used to overcome the unused-vars. This is still an important state though
   * so it is being kept here.
   */
  private currentTag: number;
  private menubarRef: React.RefObject<AnnotationMenu>;
  private menubarElement: HTMLElement | undefined;
  private selectedAnnotation: AnnotationLayer | null;

  /* State for first call on video inference toaster */
  private isFirstCallPerformed: boolean;

  /* States for Toaster */
  private toaster: Toaster;
  private progressToastInterval?: number;
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  /* Reference to background Image or Video */
  backgroundImg: HTMLElement | null;

  constructor(props: AnnotatorProps) {
    super(props);

    this.state = {
      analyticsResult: [],
      analyticsMode: false,
      currentAssetAnnotations: [],
      userEditState: "None",
      changesMade: false,
      assetList: [],
      cacheList: [],
      tagInfo: {
        modelHash: undefined,
        tags: {},
      },
      fileManagementOpen: false,
      advancedSettingsOpen: false,
      imageListCollapsed: false,
      annotatedAssetsHidden: false,
      killVideoPrediction: false,
      isSyncing: false,
      hiddenAnnotations: new Set<string>(),
      uiState: null,
      predictTotal: 0,
      predictDone: 0,
      multiplier: 1,
      confidence: 0.5,
      annotationOptions: {
        isOutlined: true,
        opacity: 0.45,
      },
      filterArr: [],
      alwaysShowLabel: false,
      showSelected: true,
      inferenceOptions: {
        bulkAnalysisStatus: "both",
        cacheResults: false,
        iou: 0.8,
        video: {
          frameInterval: 1,
        },
      },
      currAnnotationPlaybackId: 0,
    };

    this.toaster = new Toaster({}, {});
    this.progressToastInterval = 600;

    this.currentTag = 0;
    this.project = this.props.project;
    this.menubarRef = React.createRef();
    this.menubarElement = undefined;

    this.isFirstCallPerformed = false;

    /* Placeholder Value for Initialization */
    this.currentAsset = {} as AssetAPIObject;
    this.selectedAnnotation = null;

    this.annotationGroup = new L.FeatureGroup();

    /* Image Bar Reference to Track Which Image is Selected */
    this.imagebarRef = React.createRef();
    this.backgroundImg = null;

    this.selectAsset = this.selectAsset.bind(this);
    this.showToaster = this.showToaster.bind(this);
    this.renderProgress = this.renderProgress.bind(this);
    this.singleAnalysis = this.singleAnalysis.bind(this);
    this.getInference = this.getInference.bind(this);
    this.bulkAnalysis = this.bulkAnalysis.bind(this);
    this.updateAnnotations = this.updateAnnotations.bind(this);

    this.resetControls = this.resetControls.bind(this);

    this.refreshProject = this.refreshProject.bind(this);
    this.setAnnotationTag = this.setAnnotationTag.bind(this);
    this.switchAnnotation = this.switchAnnotation.bind(this);
    this.handleFileManagementOpen = this.handleFileManagementOpen.bind(this);
    this.handleFileManagementClose = this.handleFileManagementClose.bind(this);
    this.handleAdvancedSettingsOpen = this.handleAdvancedSettingsOpen.bind(
      this
    );
    this.handleAdvancedSettingsClose = this.handleAdvancedSettingsClose.bind(
      this
    );
    this.handlePlayPauseVideoOverlay = this.handlePlayPauseVideoOverlay.bind(
      this
    );
    this.updateImage = this.updateImage.bind(this);

    this.setAnnotationVisibility = this.setAnnotationVisibility.bind(this);
    this.setAllAnnotationVisibility = this.setAllAnnotationVisibility.bind(
      this
    );
    this.filterAnnotationVisibility = this.filterAnnotationVisibility.bind(
      this
    );
    this.setAnnotationOptions = this.setAnnotationOptions.bind(this);
    this.toggleShowSelected = this.toggleShowSelected.bind(this);
    this.setAnnotatedAssetsHidden = this.setAnnotatedAssetsHidden.bind(this);
  }

  async componentDidMount(): Promise<void> {
    this.menubarElement = document.getElementById("image-bar") as HTMLElement;

    /* Attach Listeners for Translating Vertical to Horizontal Scroll */
    this.menubarElement.addEventListener(
      "onwheel" in document ? "wheel" : "mousewheel",
      this.handleVerticalScrolling
    );

    /* Implicit rR Loading for Leaflet */
    this.map = L.map("annotation-map", {
      scrollWheelZoom: true,
      zoomAnimation: false,
      zoomDelta: 0,
      zoomSnap: 0,
      minZoom: -3,
      maxZoom: 3,
      crs: L.CRS.Simple,
      attributionControl: false,
      zoomControl: false,
      doubleClickZoom: false,
    }).setView(Coordinate(5000, 5000), 0);

    this.annotationGroup.addTo(this.map);

    this.map.on("mouseup", () => {
      if (this.videoOverlay) {
        const videoElement = this.videoOverlay.getElement();
        if (videoElement !== document.activeElement) {
          videoElement?.focus();
        }
      }
    });

    const imageUrl = "";
    const imageBounds = [Coordinate(30000, 0), Coordinate(0, 23000)];
    /* Render First Image */
    this.imageOverlay = L.imageOverlay(imageUrl, imageBounds);
    this.videoOverlay = L.videoOverlay(imageUrl, imageBounds, {
      interactive: true,
    });

    /**
     * Setup Singleton Instance to Annotator and Map
     */
    // eslint-disable-next-line no-new
    new AnnotatorInstanceSingleton(this.map, this);

    /* Slight delay so that all images can be reliably fetched from the server */
    setTimeout(() => this.updateImage(), 200);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  componentDidUpdate() {
    /* Obtain Tag Map for loaded Model */
    /* The conditional checks are necessary due to the use of setStates */
    if (
      this.props.loadedModel &&
      this.props.loadedModel.hash !== this.state.tagInfo.modelHash
    ) {
      APIGetModelTags(this.props.loadedModel.hash)
        .then(result => {
          const tagInfo = {
            modelHash: this.props.loadedModel?.hash,
            tags: result.data,
          };
          this.setState({
            tagInfo,
            advancedSettingsOpen: false,
          });
          if (Object.keys(this.state.tagInfo.tags).length > 0) {
            this.currentTag = 0;
          }

          (this.annotationGroup as any).tags = this.state.tagInfo.tags;
        })
        .catch(error => {
          let message = "Failed to obtain loaded model tags.";
          if (error.response) {
            message = `${error.response.data.message}`;
          }

          CreateGenericToast(message, Intent.DANGER, 3000);
        });
      this.updateImage();
    }

    if (!this.props.loadedModel && this.state.tagInfo.modelHash !== undefined) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        tagInfo: {
          modelHash: undefined,
          tags: {},
        },
      });
      (this.annotationGroup as any).tags = this.state.tagInfo.tags;
    }
  }

  componentWillUnmount(): void {
    /* Check if Menubar Targetted */
    if (this.menubarElement !== undefined)
      this.menubarElement.removeEventListener(
        "onwheel" in document ? "wheel" : "mousewheel",
        this.handleVerticalScrolling
      );
  }

  private handlePlayPauseVideoOverlay() {
    const videoElement = this.videoOverlay?.getElement();

    if (videoElement) {
      if (videoElement.onplaying) {
        if (videoElement.paused) {
          videoElement.play();
        } else {
          videoElement.pause();
        }
      }
    }
  }

  private handleAdvancedSettingsClose() {
    this.setState({ advancedSettingsOpen: false });
  }
  private handleAdvancedSettingsOpen() {
    this.setState({ advancedSettingsOpen: true });
  }

  private handleFileManagementClose() {
    this.setState({ fileManagementOpen: false });
  }
  private handleFileManagementOpen() {
    this.setState({ fileManagementOpen: true });
  }

  /* Handler for Converting Vertical Scroll to Horizontal Scroll */
  private handleVerticalScrolling = (e: any) => {
    const dist = e.deltaY * 1.5;
    /* Check if Targeted */
    if (this.menubarElement !== undefined)
      this.menubarElement.scrollLeft += dist;
  };

  /**
   * Setting of User State
   */
  private setUserState(state: EditState) {
    if (this.state.userEditState === state) return;

    if (state === "None") {
      this.setState({ userEditState: state });
      return;
    }

    this.resetControls();
    this.setState({ userEditState: state });
  }

  public setAnnotationTag(tagIndex: number): number {
    this.currentTag = tagIndex;
    return this.currentTag;
  }

  /**
   * Updates the annotationOptions, handling both boolean
   * and number case
   * @param {boolean | number } newOption - updatedOptions
   */
  private setAnnotationOptions(newOption: boolean | number): void {
    this.setState(
      prevState => {
        const config = prevState.annotationOptions;
        switch (typeof newOption) {
          case "boolean":
            config.isOutlined = newOption
              ? true
              : (!prevState.annotationOptions.isOutlined as any);
            break;
          case "number":
            config.opacity = newOption;
            break;
          default:
            break;
        }
        return { annotationOptions: config };
      },
      () => this.filterAnnotationVisibility()
    );
  }

  /**
   * Set selected annotation to new annotation
   * @param annotation - annotation layer to be selected
   */
  public setSelectedAnnotation(annotation: AnnotationLayer | null): void {
    /* Deselect previous annotation */
    if (this.selectedAnnotation) {
      this.selectedAnnotation.options.fillOpacity = 0.35;
      this.selectedAnnotation.fire("mouseout");
    }

    /* Select new annotation */
    this.selectedAnnotation = annotation;
    if (this.selectedAnnotation) {
      /* If annotation not null, enable editing */
      this.selectedAnnotation.options.fillOpacity = 0.7;
    }

    /* Update selected annotation on menubar */
    if (this.menubarRef.current !== null)
      this.menubarRef.current.setSelectedAnnotation(annotation);
  }

  /**
   * Show or hide a list of annotations.
   * @param visible - set true to show annotations, false to hide annotations
   * @param annotationList -  list of target annotations
   */
  public setAnnotationVisibility(
    visible: boolean,
    ...annotationList: any[]
  ): void {
    this.setState(
      prevState => {
        const hiddenAnnotations = new Set<string>(prevState.hiddenAnnotations);

        annotationList.forEach(annotation => {
          if (visible) {
            hiddenAnnotations.delete(annotation.options.annotationID);
          } else {
            hiddenAnnotations.add(annotation.options.annotationID);
          }
        });
        return { hiddenAnnotations };
      },
      () => this.filterAnnotationVisibility()
    );
  }

  /**
   * Show or hide all annotations in annotationGroup.
   * @param visible - set true to show annotations, false to hide annotations
   */
  public setAllAnnotationVisibility(visible: boolean): void {
    /* Hide all annotations */
    if (visible) {
      this.map.addLayer(this.annotationGroup);
      /* Clear hidden annotations */
      this.setState({ hiddenAnnotations: new Set() });
    } else {
      this.map.removeLayer(this.annotationGroup);
      /* Set of all annotation IDs in annotationGroup */
      this.setState({
        hiddenAnnotations: new Set<string>(
          Object.values((this.annotationGroup as any)._layers).map(
            (annotation: any) => annotation.options.annotationID as string
          )
        ),
      });
    }
  }

  /**
   * Set image bar to either show thumbnails for all assets,
   * or only assets that are unannotated
   * @param flag - Whether to show only unannotated thumbnails
   */
  public setAnnotatedAssetsHidden(flag: boolean): void {
    this.setState({ annotatedAssetsHidden: flag });
  }

  private async killVideoPrediction() {
    this.setState({ killVideoPrediction: true, uiState: null });
    if (this.currentAsset.type === "video") {
      await APIKillVideoInference().catch(error => {
        let message = "Failed to kill video prediction.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }
        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    }
  }

  private async bulkAnalysis() {
    /* Blocker to account for case where there is no model or image to perform prediction */
    if (isEmpty(this.state.assetList) && !this.props.loadedModel) {
      CreateGenericToast(
        "There are no models and images loaded",
        Intent.WARNING,
        3000
      );
      return;
    }
    if (!this.props.loadedModel) {
      CreateGenericToast("There is no model loaded", Intent.WARNING, 3000);
      return;
    }
    if (isEmpty(this.state.assetList)) {
      CreateGenericToast("There is no image loaded", Intent.WARNING, 3000);
      return;
    }

    let numberToBulkAnalysis: number;
    let bulkList: any[];
    switch (this.state.inferenceOptions.bulkAnalysisStatus) {
      case "image": {
        bulkList = this.state.assetList.filter(asset => asset.type === "image");
        numberToBulkAnalysis = bulkList.length;
        break;
      }
      case "video": {
        bulkList = this.state.assetList.filter(asset => asset.type === "video");
        numberToBulkAnalysis = bulkList.length;
        break;
      }
      case "both": {
        bulkList = this.state.assetList;
        numberToBulkAnalysis = this.state.assetList.length;
        break;
      }
      default:
        bulkList = this.state.assetList;
        numberToBulkAnalysis = this.state.assetList.length;
        break;
    }

    this.setState({
      predictTotal: numberToBulkAnalysis,
      predictDone: 0,
      multiplier: 1,
      uiState: "Predicting",
    });

    const key = this.toaster.show(this.renderProgress(0));

    // eslint-disable-next-line no-restricted-syntax
    for (const asset of bulkList) {
      if (this.state.killVideoPrediction) {
        if (asset.type === "image")
          // eslint-disable-next-line no-await-in-loop
          await this.getInference(this.currentAsset, false);
        break;
      }
      this.selectAsset(asset, false);
      // eslint-disable-next-line no-await-in-loop
      await this.getInference(asset, true);
      if (this.state.uiState === "Predicting") {
        this.setState(
          prevState => {
            return { predictDone: prevState.predictDone + 1 };
          },
          () => {
            this.toaster.show(
              this.renderProgress(
                (this.state.predictDone / this.state.predictTotal) * 100
              ),
              key
            );
          }
        );
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise(res => setTimeout(res, 1000));
    }

    await this.updateImage();
    this.setState({
      predictDone: 0,
      predictTotal: 100,
      uiState: null,
      killVideoPrediction: false,
    });
  }

  /**
   * Perform single predictions fore either Video or Image
   */
  private async singleAnalysis(reanalyse = true) {
    /* Blocker to account for case where prediction is still running */
    if (this.state.predictDone !== 0 || this.state.uiState === "Predicting") {
      CreateGenericToast("Inference is already running", Intent.WARNING, 3000);
      return;
    }

    if (isEmpty(this.currentAsset) && !this.props.loadedModel) {
      CreateGenericToast(
        "There is no model and image loaded",
        Intent.WARNING,
        3000
      );
      return;
    }

    if (isEmpty(this.currentAsset)) {
      CreateGenericToast("There is no image loaded", Intent.WARNING, 3000);
      return;
    }

    if (!this.props.loadedModel) {
      CreateGenericToast("There is no model loaded", Intent.WARNING, 3000);
      return;
    }

    this.setState({
      predictTotal: 100,
      predictDone: 0.01,
      multiplier: 1,
      uiState: "Predicting",
    });
    if (reanalyse && this.currentAsset.type === "video") {
      this.handleProgressToast(true);
      this.videoOverlay.getElement()?.pause();
    } else if (reanalyse) this.handleProgressToast();
    await this.getInference(this.currentAsset, reanalyse);
    await this.updateImage();
    if (this.currentAsset.type === "video")
      this.videoOverlay.getElement()?.play();
    this.setState({
      predictDone: 0,
      uiState: null,
      killVideoPrediction: false,
    });
  }

  /**
   * Generate data based on apexchart's timeline chart structure
   * https://apexcharts.com/javascript-chart-demos/timeline-charts/basic/
   * x: tag name
   * y: timestamp range which the tag shows on video (in milliseconds)
   */
  private setAnalyticsResult(framesData: any) {
    const newSeries: any = [];
    Object.keys(framesData || {}).forEach((ms, msIndex) => {
      if (msIndex === Object.keys(framesData).length - 1) return;
      framesData[ms].forEach((item: any) => {
        if (this.state.confidence > item.confidence) return;
        newSeries.push({
          x: item.tag.name,
          y: [parseInt(ms), parseInt(Object.keys(framesData)[msIndex + 1])],
        });
      });
    });
    this.setState({ analyticsResult: newSeries });
  }

  /**
   * Centralized Handler to Perform predictions on both Video and Images
   */
  private async getInference(
    asset: AssetAPIObject,
    reanalyse = true,
    singleAnalysis = true
  ) {
    /* Blocker to account for case where there is no model to perform prediction */
    if (!this.props.loadedModel) {
      return;
    }

    const loadedModelHash = this.props.loadedModel.hash;
    /* Hidden annotations reset every time this is initialized */
    this.setState({ hiddenAnnotations: new Set<string>() });

    if (
      asset.type === "image" &&
      (this.state.inferenceOptions.bulkAnalysisStatus !== "video" ||
        singleAnalysis)
    ) {
      await APIGetImageInference(
        loadedModelHash,
        asset.localPath,
        reanalyse,
        this.state.inferenceOptions.iou,
        "json"
      )
        .then(response => {
          if (this.currentAsset.url === asset.url && singleAnalysis)
            this.updateAnnotations(response.data);
        })
        .catch(error => {
          let message = "Failed to predict image.";
          if (error.response) {
            message = `${error.response.data.message}`;
          }
          CreateGenericToast(message, Intent.DANGER, 3000);
        });
    }
    if (
      asset.type === "video" &&
      (this.state.inferenceOptions.bulkAnalysisStatus !== "image" ||
        singleAnalysis)
    ) {
      await APIGetVideoInference(
        loadedModelHash,
        asset.localPath,
        reanalyse,
        this.state.inferenceOptions.video.frameInterval,
        this.state.inferenceOptions.iou
      )
        .then(response => {
          if (this.currentAsset.url === asset.url && singleAnalysis) {
            this.setAnalyticsResult(response.data.frames);
            const videoElement = this.videoOverlay.getElement();
            /**
             * Recursive Callback function that
             * @param {DOMHighResTimeStamp} now
             * @param {VideoFrameMetadata} metadata
             */
            const videoFrameCallback = (
              now: DOMHighResTimeStamp,
              metadata: VideoFrameMetadata
            ) => {
              /* Calculating the refresh rate of annotation rendering */
              const secondsInterval =
                this.state.inferenceOptions.video.frameInterval /
                response.data.fps;
              const quotient = Math.floor(metadata.mediaTime / secondsInterval);

              /* Interval to determine the refresh-rate of annotation */
              const key = Math.floor(
                quotient * secondsInterval * 1000
              ).toString();

              if (response.data.frames[key]) {
                this.updateAnnotations(response.data.frames[key]);
              }

              /**
               * Id to track the current handler number so that this handler
               * can be removed when selectAsset is called. more information
               * on https://wicg.github.io/video-rvfc/
               */
              const videoId = (videoElement as any).requestVideoFrameCallback(
                videoFrameCallback
              );
              this.setState({ currAnnotationPlaybackId: videoId });
            };

            if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
              (videoElement as any).requestVideoFrameCallback(
                videoFrameCallback
              );
            }
          }
        })
        .catch(error => {
          let message = "Failed to predict video.";
          let intent: Intent = Intent.DANGER;
          if (error.response) {
            message = `${error.response.data.message}`;
          }
          if (error.response.data.error === "STOPPEDPROCESS")
            intent = Intent.PRIMARY;
          CreateGenericToast(message, intent, 3000);
        });
    }
  }

  /**
   * Atomic function that takes annotations generated from getInference
   * and renders the annotations on the Leaflet Layer
   * @param {any} annotations
   */
  private updateAnnotations = (annotations: any) => {
    const res = {
      metadata: this.currentAsset.metadata,
      url: this.currentAsset.url,
      filename: this.currentAsset.filename,
      assetUrl: this.currentAsset.assetUrl,
      annotations,
      thumbnailUrl: this.currentAsset.thumbnailUrl,
      localPath: this.currentAsset.localPath,
      type: this.currentAsset.type,
      isCached: this.currentAsset.isCached,
    };
    const currentAssetAnnotations: Array<PolylineObjectType> = RenderAssetAnnotations(
      this.map,
      this.annotationGroup,
      res,
      this.project,
      this.currentAsset.metadata.width,
      this.currentAsset.metadata.height,
      // eslint-disable-next-line react/no-access-state-in-setstate
      this.state.tagInfo.tags
    );

    this.annotationGroup.clearLayers();

    currentAssetAnnotations.forEach(annotation => {
      this.annotationGroup.addLayer(annotation);
    });

    this.setState({
      currentAssetAnnotations,
    });

    /* Update menu bar annotations */
    this.updateMenuBarAnnotations();
    /* Show all annotations */
    this.filterAnnotationVisibility();
  };

  /**
   * Update ImageBar by reseting the cachelist and assetlist
   */
  private updateImage = async () => {
    if (this.props.loadedModel) {
      /**
       * Get list of files that has its prediction cached
       */
      await APIGetCacheList(this.props.loadedModel.hash)
        .then(res => {
          this.setState({ cacheList: res.data });
        })
        .catch(() => {
          /* Empty the cacheList since we can't get the list */
          this.setState({ cacheList: [] });
        });
    }

    /* Get All Existing Registered Folder and Image Assets */
    await APIGetAsset().then(res => {
      /* Generate New Asset List Based on Updated Data */
      const newImageAssets = res.data.map((encodedUri: string) => {
        const decodedUri = decodeURIComponent(encodedUri);
        const seperator = decodedUri.includes("\\") ? "\\" : "/";
        const type = decodedUri.match(/\.(?:mov|mp4|wmv)/i) ? "video" : "image";
        const isCached = this.state.cacheList.includes(encodedUri);
        return {
          url: encodedUri,
          filename: decodedUri.split(seperator).pop(),
          assetUrl: APIGetImageData(encodedUri),
          thumbnailUrl: APIGetImageData(encodedUri),
          localPath: encodedUri,
          type,
          isCached,
        };
      });

      this.setState({ assetList: newImageAssets });
    });
  };

  private setFilterArr = (values: Array<string>) => {
    this.setState({ filterArr: values }, () => {
      this.filterAnnotationVisibility();
    });
  };

  private toggleShowSelected = () => {
    this.setState(
      prevState => {
        return {
          showSelected: !prevState.showSelected,
        };
      },
      () => {
        this.filterAnnotationVisibility();
      }
    );
  };

  private toggleConfidence = (value: number) => {
    /* Set Confidence Value based on Slider moving */
    this.setState({ confidence: value / 100 }, () => {
      this.filterAnnotationVisibility();
    });
  };

  private handleChangeInAdvancedSettings = (value: any, key: string) => {
    this.setState(prevState => {
      const settings = prevState.inferenceOptions;
      if (key === "bulkAnalysisStatus") {
        settings.bulkAnalysisStatus = value;
      }
      if (key === "frameInterval") {
        settings.video.frameInterval = value;
      }
      if (key === "iou") {
        settings.iou = value;
      }
      return { inferenceOptions: settings };
    });
  };

  /**
   * Increments the selected asset by 1 according to the left or right keys
   * @param left - Returns true for left key and false for right key
   */
  private switchAnnotation = (left: boolean) => {
    /**
     * Filter currently visible assets based on current settings
     * Only visible assets can be selected
     */
    const visibleAssets = this.state.assetList.filter((_: any) =>
      this.isAssetVisible()
    );

    const currentIndex = visibleAssets.findIndex(
      asset => asset.assetUrl === this.currentAsset.assetUrl
    );

    /* Aborts function if the direction of increment is out of bounds */
    if (
      (left && currentIndex <= 0) ||
      (!left && currentIndex >= visibleAssets.length - 1)
    ) {
      return;
    }

    const shift = left ? -1 : 1;
    const newIndex = Math.min(
      Math.max(0, currentIndex + shift),
      visibleAssets.length - 1
    );

    this.selectAsset(visibleAssets[newIndex]);

    /* Reset selected annotation */
    this.setSelectedAnnotation(null);

    const imageBar = document.getElementById("image-bar");
    if (imageBar !== null) {
      imageBar.scrollLeft += shift * 120;
    }
  };

  /**
   * Generic rendering that handles complex toast rendering
   */
  private handleProgressToast = (isSingleVideoPrediction = false) => {
    const key = this.toaster.show(this.renderProgress(0));
    /* Case where no ETA is needed */
    if (!isSingleVideoPrediction) {
      this.progressToastInterval = window.setInterval(() => {
        if (
          this.state.uiState === null ||
          this.state.predictDone === this.state.predictTotal
        ) {
          this.toaster.show(this.renderProgress(100), key);
          window.clearInterval(this.progressToastInterval);
        } else {
          /* Need to shift this over later */
          const addRand = (Math.random() * 15) / this.state.multiplier;
          if (this.state.predictDone + addRand < this.state.predictTotal * 0.98)
            this.setState(prevState => {
              return {
                predictDone: prevState.predictDone + addRand,
                multiplier: prevState.multiplier + 0.18,
              };
            });
          const donePercent =
            (this.state.predictDone / this.state.predictTotal) * 100;
          this.toaster.show(this.renderProgress(donePercent), key);
        }
      }, 200);
      /* Case where ETA is needed */
    } else {
      let eta: any;
      this.progressToastInterval = window.setInterval(() => {
        APIGetPredictionProgress().then(response => {
          const { progress, total } = response.data;
          if (!this.isFirstCallPerformed) {
            this.isFirstCallPerformed = true;
            /* Initialize ETA Instance to record estimated running time */
            eta = makeEta({
              min: progress,
              max: total,
              historyTimeConstant: 10,
            });
            eta.start();
            /* Default value of API call - when no video prediction */
          } else if (progress === 1 && total === 1) {
            this.toaster.show(this.renderProgress(100), key);
            window.clearInterval(this.progressToastInterval);
            this.isFirstCallPerformed = false;
            this.toaster.clear();
          } else {
            eta.report(progress);
            const secondsLeft = Math.ceil(eta.estimate());
            this.toaster.show(
              this.renderProgress(
                (progress * 100) / total,
                FormatTimerSeconds(secondsLeft)
              ),
              key
            );
          }
        });
      }, 500);
    }
  };

  private showToaster(toast: IToastProps) {
    this.toaster.show(toast);
  }

  private filterAnnotationVisibility(): void {
    /* Clear Annotation Layer */
    this.annotationGroup.clearLayers();
    const invertedProjectTags = invert(this.state.tagInfo.tags);

    /* Add Annotation Based on Confidence Value and filtered Tags */
    this.state.currentAssetAnnotations
      /*
       * @TODO : Refactor this before ProductHunt
       */
      .filter(
        (annotation: any) =>
          !this.state.hiddenAnnotations.has(annotation.options.annotationID) &&
          /* If no filters selected, should return true. This is to
              guard against some returning false on empty arrays */
          (this.state.filterArr.length === 0 ||
            /* Check if tag is present in filter (CASE-INSENSITIVE) */
            this.state.showSelected ===
              this.state.filterArr.some(filter =>
                invertedProjectTags[annotation.options.annotationTag]
                  .toLowerCase()
                  .includes(filter.toLowerCase())
              )) &&
          annotation.options.confidence >= this.state.confidence
      )
      .forEach((confidentAnnotation: any) => {
        /* Add It Onto Leaflet */
        const annotationToCommit = cloneDeep(confidentAnnotation);
        /* Customize Annotation Opacity */
        annotationToCommit.options.fillOpacity = this.state.annotationOptions.opacity;
        /* Customize Annotation Outline Toggle */
        annotationToCommit.options.weight = !this.state.annotationOptions
          .isOutlined
          ? 0
          : confidentAnnotation.options.weight;

        this.annotationGroup.addLayer(annotationToCommit);
      });

    const InvertedTags = invert(this.state.tagInfo.tags);

    /* Had to inject custom CSS */
    this.annotationGroup.eachLayer((layer: L.Layer | any) => {
      layer.unbindTooltip();
      /* Render base tooltip first to check offset */
      layer.bindTooltip(
        `<span class='bp3-tag' 
        style='color: #FFFFFF; 
        border-radius: 6px !important;
        background-color: ${layer.options.color};'>
          ${InvertedTags[layer.options.annotationTag]}
        </span>`,
        {
          interactive: !this.state.alwaysShowLabel,
          permanent: this.state.alwaysShowLabel,
          opacity: 0.9,
          direction: "center",
        }
      );
    });
  }

  /**
   * Check if a given asset should be visible given
   * the current settings
   * @param asset - asset object to check
   */
  private isAssetVisible() {
    /* Don't show annotated assets if annotatedAssetsHidden flag active */
    return !this.state.annotatedAssetsHidden;
  }

  /**
   * Handler for onImageChange - This function swaps image on leaflet canvas
   * as well as renders user-defined (if-any) annotation as LeafletLayerObjects
   * @param filename - URL of Asset
   */
  public selectAsset(asset: AssetAPIObject, singleAnalysis = true): void {
    /**
     * Check if there has been a reselection of asset, if so, we avoid
     * rescaling or map-fitting the current viewport to improve QoL
     */

    /* Checks if there is AssetReselection */
    const isAssetReselection = !(asset.assetUrl !== this.currentAsset.assetUrl);
    console.log("asset", asset.url);
    console.log("currentasset", this.currentAsset.url);
    console.log("single analysis", singleAnalysis);

    const currentVideoElement = this.videoOverlay.getElement();
    if (!isAssetReselection) {
      this.setState({ currentAssetAnnotations: [] });
      this.annotationGroup.eachLayer(layer => {
        this.annotationGroup.removeLayer(layer);
      });
      this.updateMenuBarAnnotations();
      if (currentVideoElement) {
        (currentVideoElement as any).cancelVideoFrameCallback(
          this.state.currAnnotationPlaybackId
        );
      }
    }

    const initialSelect = Object.keys(this.currentAsset).length === 0;
    this.imagebarRef.highlightAsset(asset.assetUrl);

    /* Clear Previous Images' Annotation from Annotation Group */
    this.annotationGroup.clearLayers();
    /**
     * PLEASE REMOVE IN FORESEABLE FUTURE
     */
    (this.annotationGroup as any).tags = this.state.tagInfo.tags;

    if (asset.type === "image") {
      if (!this.map.hasLayer(this.imageOverlay)) {
        this.videoOverlay.remove();
        this.imageOverlay.addTo(this.map);
      }

      /* Set Selected Image */
      const selectedImage = new Image();
      /* Assign Image URL */
      this.imageOverlay.setUrl(asset.assetUrl);
      selectedImage.src = asset.assetUrl;

      selectedImage.onload = () => {
        this.imageOverlay.setBounds(
          new L.LatLngBounds([
            [0, 0],
            [selectedImage.height, selectedImage.width],
          ])
        );

        /* Update Current Asset with Image Metadata */
        this.currentAsset = {
          ...asset,
          metadata: {
            width: selectedImage.width,
            height: selectedImage.height,
          },
        };
        /* Set Centre Viewport */
        if (!isAssetReselection) {
          /* Work Around, Allowing Map to Zoom to Any Factor */
          this.map.setMinZoom(-5);
          /* Invalidate Previous Sizing */
          this.map.invalidateSize();
          /* Artificial Delay */
          setTimeout(() => {
            this.map.fitBounds(this.imageOverlay.getBounds(), {
              padding: new L.Point(20, 20),
            });
          }, 150);
          /* Reset to Default Zoom */
          this.map.setMinZoom(-3);
          /* Get inference if Image is Cached */
          if (asset.isCached && singleAnalysis) this.singleAnalysis(false);
        }

        if (initialSelect) {
          this.setState({});
        }
      };

      /* Select background image in DOM */
      this.backgroundImg = document.querySelector(
        ".leaflet-pane.leaflet-overlay-pane img.leaflet-image-layer"
      );
    }
    if (asset.type === "video") {
      if (!this.map.hasLayer(this.videoOverlay)) {
        this.imageOverlay.remove();
        this.videoOverlay.addTo(this.map);
      }

      const selectedVideo = document.createElement("video");
      selectedVideo.setAttribute("src", asset.assetUrl);
      this.videoOverlay.setUrl(asset.assetUrl);

      selectedVideo.onloadedmetadata = () => {
        this.videoOverlay.setBounds(
          new L.LatLngBounds([
            [0, 0],
            [selectedVideo.videoHeight, selectedVideo.videoWidth],
          ])
        );

        /* Update Current Asset with Image Metadata */
        this.currentAsset = {
          ...asset,
          metadata: {
            width: selectedVideo.videoWidth,
            height: selectedVideo.videoHeight,
          },
        };

        const videoElement = this.videoOverlay.getElement();

        if (videoElement) {
          videoElement.controls = true;
          videoElement.setAttribute("controlsList", "nofullscreen nodownload");
        }

        if (!isAssetReselection) {
          /* Work Around, Allowing Map to Zoom to Any Factor */
          this.map.setMinZoom(-5);
          /* Invalidate Previous Sizing */
          this.map.invalidateSize();
          /* Artificial Delay */
          setTimeout(() => {
            this.map.fitBounds(this.videoOverlay.getBounds(), {
              padding: new L.Point(20, 20),
            });
            /* Reset to Default Zoom */
            this.map.setMinZoom(-3);

            /** Set Focus */
            videoElement?.focus();
          }, 150);
          /* Get inference if Video is Cached */
          if (asset.isCached && singleAnalysis) this.singleAnalysis(false);
        } else {
          /** Set Focus */
          videoElement?.focus();
        }
        if (initialSelect) {
          this.setState({});
        }
      };

      this.backgroundImg = document.querySelector(
        ".leaflet-pane.leaflet-overlay-pane video.leaflet-image-layer"
      );
    }
  }

  /**
   * Update annotations list in menu bar state
   * to current annotationGroup
   */
  public updateMenuBarAnnotations(): void {
    if (this.menubarRef.current !== null) {
      this.menubarRef.current.setAnnotations(this.annotationGroup);
    }
  }

  /**
   * Set currently selected tag to target tag using respective hash
   * - Used to select annotation tag and update menu bar from external
   *  components, where tag index is unknown
   * @param tagHash - Tag hash of tag to be selected
   */
  public selectAnnotationTagByHash(tagHash: number): void {
    /* Find tag index */
    const tagIndex = Object.values(this.state.tagInfo.tags).indexOf(tagHash);
    if (tagIndex !== -1) {
      /* If target tag in project tags, set data members */
      this.currentTag = tagIndex;
      /* Update menu bar */
      if (this.menubarRef.current !== null)
        this.menubarRef.current.setAnnotationTag(tagIndex);
    }
  }

  /**
   * Refresh project for
   * - Annotation Tag Changes
   * - Get Periodic Updates
   */
  private async refreshProject() {
    // await APIGetProjectAnnotatorAssets(this.project).then(result => {
    //   this.setState({
    //     assetList: result.data.assets,
    //     projectTags: result.data.tags,
    //   });
    //   /* Effect Annotation Changes */
    // });
    this.selectAsset(this.currentAsset);
  }

  /**
   * Add New Created Tag
   * - Callback for the Annotation level
   * - Updates the List of Project Tags when a new one is created in Annotation Select
   */
  public addNewTag(tagname: string, tagid: number): void {
    this.setState(prevState => {
      const updatedTags = { ...prevState.tagInfo.tags };
      updatedTags[tagname] = tagid;
      return {
        tagInfo: { modelHash: prevState.tagInfo.modelHash, tags: updatedTags },
      };
    });
  }

  /**
   * Disable All Handlers, Allowing for a single state only button management
   */
  public resetControls(): void {
    this.setUserState("None");
    /* this.handleDrawRectangle.disable();
    this.handleDrawPolygon.disable(); 
    this.handleRemoveAnnotation.disable(); */
    this.setSelectedAnnotation(null);
  }

  private syncAllFolders = async () => {
    this.setState({ isSyncing: true });

    await APIUpdateAsset()
      .then(() => {
        this.updateImage();
      })
      .catch(error => {
        let message = "Failed to sync all folders.";
        if (error.response) {
          message = `${error.response.data.message}`;
        }
        CreateGenericToast(message, Intent.DANGER, 3000);
      });
    this.setState({ isSyncing: false });
  };

  private renderProgress(amount: number, message = ""): IToastProps {
    const toastProps: IToastProps = {
      className: `bp3-text-muted ${this.props.useDarkTheme ? "bp3-dark" : ""}`,
      icon: "predictive-analysis",
      message: (
        <ProgressBar
          className={"predict-prog"}
          intent={amount < 100 ? "primary" : "success"}
          value={amount / 100}
        />
      ),
      onDismiss: (didTimeoutExpire: boolean) => {
        if (!didTimeoutExpire) {
          // user dismissed toast with click
          this.killVideoPrediction();
          window.clearInterval(this.progressToastInterval);
        }
        this.isFirstCallPerformed = false;
      },
      timeout: amount < 100 ? 0 : 600,
    };

    if (message !== "") toastProps.action = { text: message };

    return toastProps;
  }

  /* Hotkey for Quick Annotation Selection */
  public renderHotkeys(): JSX.Element {
    return (
      <Hotkeys>
        {/* Hotkey Bindings for Annotations */}
        <Hotkey
          global={true}
          combo={"o"}
          label={"Open Folder"}
          onKeyDown={this.handleFileManagementOpen}
        />
        <Hotkey
          global={true}
          combo={"s"}
          label={"Sync All Folders"}
          onKeyDown={this.syncAllFolders}
        />
        <Hotkey
          global={true}
          combo={"A"}
          label={"Analyze"}
          onKeyDown={() => this.singleAnalysis()}
        />
        <Hotkey
          global={true}
          combo={"b"}
          label={"Bulk Analysis"}
          onKeyDown={this.bulkAnalysis}
        />
        <Hotkey
          global={true}
          combo={"esc"}
          label={"Exit Current Mode"}
          onKeyDown={this.resetControls}
        />
        <Hotkey
          global={true}
          combo={"h"}
          label={"Show / Hide Annotations"}
          onKeyDown={() => {
            /* Allow Toggling of Layer Hiding */
            if (this.map.hasLayer(this.annotationGroup))
              this.map.removeLayer(this.annotationGroup);
            else this.map.addLayer(this.annotationGroup);
          }}
        />
        <Hotkey
          global={true}
          combo={"l"}
          label={"Show / Hide Label"}
          onKeyDown={() => {
            /* Allow Toggling of Layer Hiding */
            this.setState(
              prevState => ({
                alwaysShowLabel: !prevState.alwaysShowLabel,
              }),
              () => {
                this.filterAnnotationVisibility();
              }
            );
          }}
        />
        <Hotkey
          global={true}
          combo={"left"}
          label={"Load previous asset"}
          onKeyDown={() => this.switchAnnotation(true)}
        />
        <Hotkey
          global={true}
          combo={"right"}
          label={"Load previous asset"}
          onKeyDown={() => this.switchAnnotation(false)}
        />
        <Hotkey
          global={true}
          combo={"space"}
          label={"Play/Pause Video"}
          onKeyDown={this.handlePlayPauseVideoOverlay}
        />
        {Object.entries(this.state.tagInfo.tags).map(([tagname], idx) => {
          /* Only Perform Hotkey for First 9 Objects */
          if (idx > 9) return;

          // eslint-disable-next-line consistent-return
          return (
            <Hotkey
              key={tagname}
              global={true}
              combo={`${idx + 1}`}
              label={`Shortcut : ${tagname}`}
              onKeyDown={() => {
                this.currentTag = idx as number;
                if (this.menubarRef.current != null)
                  this.menubarRef.current.setAnnotationTag(idx);
              }}
            />
          );
        })}
      </Hotkeys>
    );
  }

  render(): JSX.Element {
    /* Prefix for Dynamic Styling of Collapsing Image List */
    const collapsedButtonTheme = this.props.useDarkTheme ? "" : "light-";
    const isCollapsed = this.state.imageListCollapsed ? "collapsed-" : "";

    /* Filter currently visible assets based on current settings */
    const visibleAssets = this.state.assetList.filter(() =>
      this.isAssetVisible()
    );

    return (
      <div>
        <Toaster {...this.state} ref={this.refHandlers.toaster} />
        <div className={"workspace"}>
          {/* Appends Styling Prefix if Image List is Collapsed */}
          <div
            className={[isCollapsed, "image-list"].join("")}
            id={"image-list"}
          >
            <Button
              className={[collapsedButtonTheme, "collapse-button"].join("")}
              large
              icon={this.state.imageListCollapsed ? "caret-up" : "caret-down"}
              onClick={() => {
                this.setState(prevState => ({
                  imageListCollapsed: !prevState.imageListCollapsed,
                }));
              }}
            />
            <div
              className={[collapsedButtonTheme, "collapse-button-effect"].join(
                ""
              )}
            />
            {/* Appends Styling Prefix */}
            <Card
              className={[isCollapsed, "image-bar"].join("")}
              id={"image-bar"}
            >
              {this.state.analyticsMode ? (
                <AnalyticsBar
                  analyticsResult={this.state.analyticsResult}
                  videoOverlay={this.videoOverlay.getElement()}
                  {...this.props}
                />
              ) : (
                <ImageBar
                  ref={ref => {
                    this.imagebarRef = ref;
                  }}
                  // Only visible assets should be shown
                  assetList={visibleAssets}
                  callbacks={{ selectAssetCallback: this.selectAsset }}
                  {...this.props}
                />
              )}
            </Card>
          </div>

          {/* Expands when Image Bar is Collapsed */}
          <div
            className={
              this.state.imageListCollapsed
                ? "expanded-annotator-space"
                : "annotator-space"
            }
          >
            {/* Non-Ideal State Render */}
            {Object.keys(this.currentAsset).length === 0 ? (
              <Card className={"annotator-non-ideal"}>
                <div className="bp3-non-ideal-state">
                  <div className="bp3-non-ideal-state-visual">
                    <span>
                      <Icon icon="media" iconSize={60} />
                    </span>
                  </div>
                  <h4 className="bp3-heading bp3-text-muted">
                    Select an Image to Annotate
                  </h4>
                </div>
              </Card>
            ) : null}
            {/* End Non-Ideal State Render */}
            <Card className={"main-annotator"}>
              <div id="annotation-map" className={"style-annotator"} />
              {this.backgroundImg ? (
                <div className="annotator-settings-button">
                  <AnnotatorSettings
                    annotationOptions={this.state.annotationOptions}
                    analyticsMode={this.state.analyticsMode}
                    callbacks={{
                      setAnnotatedAssetsHidden: this.setAnnotatedAssetsHidden,
                      setAnnotationOptions: this.setAnnotationOptions,
                      setAnalyticsMode: val =>
                        this.setState({ analyticsMode: val }),
                    }}
                  />
                </div>
              ) : null}
            </Card>
          </div>
          <div className={"annotator-controls"}>
            <AnnotationMenu
              ref={this.menubarRef}
              isSyncing={this.state.isSyncing}
              projectTags={this.state.tagInfo.tags}
              userEditState={this.state.userEditState}
              changesMade={this.state.changesMade}
              uiState={this.state.uiState}
              predictDone={this.state.predictDone}
              predictTotal={this.state.predictTotal}
              hiddenAnnotations={this.state.hiddenAnnotations}
              confidence={this.state.confidence}
              filterArr={this.state.filterArr}
              showSelected={this.state.showSelected}
              useDarkTheme={this.props.useDarkTheme}
              isConnected={this.props.isConnected}
              loadedModel={this.props.loadedModel}
              currentAsset={this.currentAsset}
              assetList={this.state.assetList}
              callbacks={{
                ResetControls: this.resetControls,
                OpenFileManagement: this.handleFileManagementOpen,
                SetAnnotationTag: this.setAnnotationTag,
                OpenAdvancedSettings: this.handleAdvancedSettingsOpen,
                SetAnnotationVisibility: this.setAnnotationVisibility,
                SingleAnalysis: this.singleAnalysis,
                BulkAnalysis: this.bulkAnalysis,
                ToggleConfidence: this.toggleConfidence,
                /* Used by TagSelector */
                SetFilterArr: this.setFilterArr,
                ToggleShowSelected: this.toggleShowSelected,
                SyncAllFolders: this.syncAllFolders,
              }}
            />
            {/* File Management Modal */}
            {this.state.fileManagementOpen ? (
              <FileModal
                onClose={this.handleFileManagementClose}
                isOpen={true}
                allowUserClose={true}
                callbacks={{
                  RefreshProject: this.refreshProject,
                  UpdateImage: this.updateImage,
                }}
                {...this.props}
              />
            ) : null}
            {/* Tag Management Modal */}
            {this.state.advancedSettingsOpen ? (
              <SettingsModal
                inferenceOptions={this.state.inferenceOptions}
                onClose={
                  !this.state.advancedSettingsOpen
                    ? this.handleAdvancedSettingsOpen
                    : this.handleAdvancedSettingsClose
                }
                isOpen={true}
                allowUserClose={true}
                callbacks={{
                  HandleChangeInSettings: this.handleChangeInAdvancedSettings,
                }}
                {...this.props}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}
