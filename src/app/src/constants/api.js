// Base Server URL
export const SERVER_ADDRESS = "http://localhost:5000";
export const IS_ALIVE = `/heartbeat`;
export const SHUTDOWN = `/shutdown`;
export const CACHE = `/cache`;

// Assets/folders routes
export const POST_PROJECT_REGISTER_IMAGES = `/api/project/register`;
export const GET_PROJECT_ASSETS = `/api/project/assets`;
export const GET_PROJECT_ASSETS_TREE = `/api/project/assets/tree`;
export const GET_PROJECT_IMAGE_DATA = `/api/project/assets/image`;
export const UPDATE_PROJECT_ASSETS = `/api/project/sync`;
export const DELETE_PROJECT_ASSETS = `/api/project/`;

// Model Routes
export const MODEL = `/api/model`;
export const REGISTER_MODEL = `/api/model/register`;
export const LOADED_MODELS = `/api/model/loadedList`;
export const LOAD_MODEL = modelKey => {
  return `/api/model/${modelKey}/load`;
};
export const UNLOAD_MODEL = modelKey => {
  return `/api/model/${modelKey}/unload`;
};
export const DELETE_MODEL = modelKey => {
  return `/api/model/${modelKey}`;
};
export const MODEL_TAGS = modelKey => {
  return `/api/model/${modelKey}/tags`;
};
export const PREDICT_VIDEO = modelKey => {
  return `/api/model/${modelKey}/predict/video`;
};
export const GET_INFERENCE_FLASK = modelKey => {
  return `/api/model/${modelKey}/predict`;
};
export const CACHE_LIST = modelKey => {
  return `/api/model/${modelKey}/cachelist`;
};

// GPU Routes
export const CLEAR_GPU = `/clear_gpu`;
export const SET_GPU = `/set_gpu`;
export const GET_GPU = `/get_gpu`;
