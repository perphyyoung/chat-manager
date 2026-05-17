import { createApp } from "vue";
import { createPinia } from "pinia";
import { logger } from "./utils/logger";

import App from "./App.vue";
import router from "./router";
import "./assets/main.css";

logger.info("Vue app starting...");

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");

logger.success("Vue app mounted");
