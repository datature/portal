import axios, { AxiosResponse } from "axios";
import { SERVER_ADDRESS, CACHE, IS_ALIVE } from "@portal/constants/api";

export function APIIsAlive(): Promise<AxiosResponse<any>> {
  return axios.get(SERVER_ADDRESS + IS_ALIVE);
}

export function APILoadCache(): Promise<AxiosResponse<any>> {
  return axios.post(SERVER_ADDRESS + CACHE);
}

export function APIRejectCache(): Promise<AxiosResponse<any>> {
  return axios.put(SERVER_ADDRESS + CACHE);
}
