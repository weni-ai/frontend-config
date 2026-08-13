interface ImportMeta {
  webpackHot?: {
    data?: Record<string, unknown>;
    accept: (
      dependencies?: string | string[] | ((err?: Error) => void),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback?: (...args: any[]) => void,
    ) => void;
    dispose: (callback: (data: Record<string, unknown>) => void) => void;
    decline: (dependencies?: string | string[]) => void;
    invalidate: () => void;
  };
}
