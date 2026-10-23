import { setupWorker } from "msw/browser"
import { brandHandlers, handlers } from "./handlers"
import { orderHandlers } from "./orderHandlers"
import { publicHandlers } from "./publicHandlers"

export const worker = setupWorker(...handlers, ...brandHandlers, ...orderHandlers, ...publicHandlers)
