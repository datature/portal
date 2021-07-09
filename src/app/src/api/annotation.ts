import axios, { AxiosResponse } from "axios";
import {
  SERVER_ADDRESS,
  GET_INFERENCE_FLASK,
  POST_PROJECT_REGISTER_IMAGES,
  GET_PROJECT_ASSETS,
  GET_PROJECT_IMAGE_DATA,
  GET_PROJECT_ASSETS_TREE,
  UPDATE_PROJECT_ASSETS,
  DELETE_PROJECT_ASSETS,
  MODEL,
  REGISTER_MODEL,
  LOAD_MODEL,
  UNLOAD_MODEL,
  DELETE_MODEL,
  MODEL_TAGS,
  PREDICT_VIDEO,
  LOADED_MODELS,
  CACHE_LIST,
  KILL_PREDICT_VIDEO,
} from "@portal/constants/api";

/* Annotation Type */
export interface AnnotationAPIObject {
  confidence: number;
  /* Project Specific */
  tag: {
    id: number;
    type: string;
  };
  /* "Rect", "Poly", "Line", "Segementation" */
  boundType: string;
  /* Normalized Coordinates up to 3 Decimal Points */
  bound: Array<Array<number>>;
  /* Associated Asset Name */
  assetName: string;
  /* Contours */
  contour: Array<Array<number>> | undefined;
  annotationID: string;
}

export interface AssetAPIObject {
  url: string;
  filename: string;
  assetUrl: string;
  thumbnailUrl: string;
  localPath: string;
  annotations: Array<AnnotationAPIObject>;
  type: string;
  isCached: boolean;
  metadata: {
    height: number;
    width: number;
  };
}

/* Annotator API Object */
export interface AnnotatorAPIObject {
  data: Array<AssetAPIObject>;
}

/* Project Server Response Type */
export interface ProjectAPIObject {
  /* Project ID - For Project Related CRUD Ops */
  projectID: string;
  /* Project Name */
  name: string;
  /* Owner UUID */
  owner: string;
  /* Users Allocated to Project */
  users: Array<string>;
  /* Tag Lists */
  tags: Array<string>;
  /* Creation Date - For Sorting or Billing */
  createDate: string;
  /* Status 0 - Default */
  status: number;
}

/* -------------- ASSETS/FOLDERS API -------------- */

export function APIGetAsset(): Promise<AxiosResponse<any>> {
  return axios.get(SERVER_ADDRESS + GET_PROJECT_ASSETS);
}

export function APIGetImageData(path: string): string {
  /* REMOVE BEFORE FLIGHT : DO NOT COMMIT */
  return `${SERVER_ADDRESS + GET_PROJECT_IMAGE_DATA}?filepath=${path}`;
}

export function APIPostRegisterImage(
  directory: string
): Promise<AxiosResponse<any>> {
  const config = {
    directory,
  };

  return axios.post(SERVER_ADDRESS + POST_PROJECT_REGISTER_IMAGES, config);
}

export function APIGetAssetsTree(): Promise<AxiosResponse<any>> {
  return axios.get(SERVER_ADDRESS + GET_PROJECT_ASSETS_TREE);
}

export function APIUpdateAsset(directory: string): Promise<AxiosResponse<any>> {
  const config = {
    directory,
  };

  return axios.post(SERVER_ADDRESS + UPDATE_PROJECT_ASSETS, config);
}

export function APIDeleteAsset(path: string): Promise<AxiosResponse<any>> {
  return axios.delete(SERVER_ADDRESS + DELETE_PROJECT_ASSETS + path);
}

/* -------------- MODEL API -------------- */

export function APIGetRegisteredModels(): Promise<AxiosResponse<any>> {
  return axios.get(SERVER_ADDRESS + MODEL);
}

export function APIRegisterModel(
  type: string,
  name: string,
  description: string,
  directory: string,
  modelKey: string,
  projectSecret: string
): Promise<AxiosResponse<any>> {
  const config = {
    type,
    name,
    description,
    credentials: {
      modelKey,
      projectSecret,
    },
    directory,
  };
  return axios.post(SERVER_ADDRESS + REGISTER_MODEL, config);
}

export function APIGetLoadedModel(): Promise<AxiosResponse<any>> {
  return axios.get(SERVER_ADDRESS + LOADED_MODELS);
}

export function APIKillVideoInference(): Promise<AxiosResponse<any>> {
  return axios.post(SERVER_ADDRESS + KILL_PREDICT_VIDEO);
}

export function APILoadModel(modelKey: string): Promise<AxiosResponse<any>> {
  return axios.post(SERVER_ADDRESS + LOAD_MODEL(modelKey));
}

export function APIUnloadModel(modelKey: string): Promise<AxiosResponse<any>> {
  return axios.put(SERVER_ADDRESS + UNLOAD_MODEL(modelKey));
}

export function APIDeleteRegisteredModel(
  modelKey: string
): Promise<AxiosResponse<any>> {
  return axios.delete(SERVER_ADDRESS + DELETE_MODEL(modelKey));
}

export function APIGetModelTags(modelKey: string): Promise<AxiosResponse<any>> {
  return axios.get(SERVER_ADDRESS + MODEL_TAGS(modelKey));
}

export function APIGetVideoInference(
  modelKey: string,
  filepath: string,
  reanalyse: boolean,
  frameInterval: number,
  iou?: number,
  confidence?: number,
  filter?: string
): Promise<AxiosResponse<any>> {
  const route = `${SERVER_ADDRESS + PREDICT_VIDEO(modelKey)}`;

  return axios.get(route, {
    params: {
      filepath,
      reanalyse,
      frameInterval,
      ...(iou ? { iou } : {}),
      ...(confidence ? { confidence } : {}),
      ...(filter ? { filter } : {}),
    },
  });
}

export function APIGetImageInference(
  modelKey: string,
  filepath: string,
  reanalyse: boolean,
  iou?: number,
  format?: string,
  filter?: string
): Promise<AxiosResponse<any>> {
  const route = `${SERVER_ADDRESS + GET_INFERENCE_FLASK(modelKey)}`;

  return axios.get(route, {
    params: {
      filepath,
      reanalyse,
      ...(iou ? { iou } : {}),
      ...(format ? { format } : {}),
      ...(filter ? { filter } : {}),
    },
  });
}

export function APIGetCacheList(modelKey: string): Promise<AxiosResponse<any>> {
  return axios.get(SERVER_ADDRESS + CACHE_LIST(modelKey));
}

export function APIDeleteCacheList(
  modelKey: string
): Promise<AxiosResponse<any>> {
  return axios.delete(SERVER_ADDRESS + CACHE_LIST(modelKey));
}
