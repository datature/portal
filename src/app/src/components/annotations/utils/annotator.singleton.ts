/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as L from "leaflet";
import Annotator from "../annotator";

/* eslint-disable no-underscore-dangle */
class AnnotatorInstanceSingleton {
  static instance: AnnotatorInstanceSingleton | null = null;

  public _map: L.DrawMap | undefined = undefined;
  public _annotator: Annotator | undefined = undefined;

  /**
   * Construct First Instance of an Annotator Singleton that provides
   * a fixed, globally-accessible instance of Annotator Component and
   * Leaflet Map.
   */
  constructor(map: L.DrawMap, annotator: Annotator) {
    if (AnnotatorInstanceSingleton.instance === null) {
      this._map = map;
      this._annotator = annotator;
      AnnotatorInstanceSingleton.instance = this;
    }
    return AnnotatorInstanceSingleton.instance;
  }

  public static get map(): L.DrawMap {
    if (AnnotatorInstanceSingleton.instance!._map === undefined) {
      AnnotatorInstanceSingleton.instance!._map = AnnotatorInstanceSingleton.instance!._annotator?.map;
    }

    return AnnotatorInstanceSingleton.instance!._map!;
  }

  public static get annotator(): Annotator {
    return AnnotatorInstanceSingleton.instance!._annotator!;
  }
}

export default AnnotatorInstanceSingleton;
