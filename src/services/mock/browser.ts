import { setupWorker } from "msw/browser"
import { brandHandlers, handlers } from "./handlers"
import { floorHandlers } from "./floorHandlers"
import { orderHandlers } from "./orderHandlers"
import { publicHandlers } from "./publicHandlers"

/** Public routes first so ` /public/brands` is never shadowed by later param routes. */
export const worker = setupWorker(...publicHandlers, ...handlers, ...brandHandlers, ...floorHandlers, ...orderHandlers)
