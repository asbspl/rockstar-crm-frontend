import { RouterProvider } from "react-router-dom";
import Providers from "./providers";
import router from "./router";
import { GlobalPopupInstaller } from "../components/common/ConfirmDialog/ConfirmDialog";

function App() {
  return (
    <Providers>
      <GlobalPopupInstaller />
      <RouterProvider router={router} />
    </Providers>
  );
}

export default App;