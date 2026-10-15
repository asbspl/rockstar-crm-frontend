import { middleware } from "./middleware";
import { rootReducer } from "./rootReducer";

export { middleware, rootReducer };

export const storeConfig = {
  reducer: rootReducer,
  middleware,
};