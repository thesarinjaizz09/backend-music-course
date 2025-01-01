import { syncVimeoData } from "./fetchVimeoData";
syncVimeoData()
  .catch(console.error)
  .finally(() => process.exit());
