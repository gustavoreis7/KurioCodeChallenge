import { restHandlers } from "./handlers";
import { controlHandlers } from "./controls";
import { socketHandlers } from "./socket";

export const handlers = [
  ...restHandlers,
  ...controlHandlers,
  ...socketHandlers,
];
