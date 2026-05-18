export const LogLevel = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];
