import { mergeConfig } from "vite";
import { nitro } from "nitro/vite";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  plugins: [nitro({ preset: "vercel" })],
});
