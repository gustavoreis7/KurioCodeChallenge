import desktop from "lighthouse/core/config/desktop-config.js";
const categories = ["performance", "accessibility", "best-practices", "seo"];
export default {
  mobile: { extends: "lighthouse:default", settings: { onlyCategories: categories } },
  desktop: { ...desktop, settings: { ...desktop.settings, onlyCategories: categories } },
};
