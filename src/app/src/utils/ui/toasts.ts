/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-underscore-dangle */
/* eslint-disable import/prefer-default-export */
import { Toaster, Position } from "@blueprintjs/core";

/**
 * Create Generic Toast - Uses "static" Toaster Object to Prevent
 * Re=Intiantiation
 */
export function CreateGenericToast(
  message: string,
  intent: string,
  timeout: number,
  icon?: any,
  action?: any
) {
  (CreateGenericToast as any)._ToasterInstance =
    (CreateGenericToast as any)._ToasterInstance ||
    Toaster.create({
      canEscapeKeyClear: false,
      position: Position.BOTTOM_RIGHT,
    });

  /* Render Toast */
  return (CreateGenericToast as any)._ToasterInstance.show({
    message,
    intent,
    timeout,
    icon,
    action,
  });
}

export function ClearAllGenericToast() {
  (CreateGenericToast as any)._ToasterInstance.clear();
}

export function DissmissToast(key: string) {
  (CreateGenericToast as any)._ToasterInstance.dismiss(key);
}
