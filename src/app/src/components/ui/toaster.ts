import { Position, Toaster } from "@blueprintjs/core";

/** Singleton toaster instance. Create separate instances for different options. */
const toaster = Toaster.create({
  className: "recipe-toaster",
  position: Position.BOTTOM_RIGHT,
  maxToasts: 4,
});

export default toaster;
