import { createConsola } from "consola";

export const logger = createConsola({
  level: import.meta.env.DEV ? 4 : 2,
  defaults: {
    tag: "ChatManager",
  },
});

export default logger;
