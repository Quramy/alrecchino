import * as models from "../model";

export function mergeConfiguration(...configurations: models.Configuration[]): models.Configuration {
  return configurations.reduce((acc, conf) => {
    if (!conf) return acc;
    return {
      ...acc,
      ...conf,
      viewport: {
        ...acc.viewport,
        ...conf.viewport,
      },
      directVariables: {
        ...acc.directVariables,
        ...conf.directVariables,
      },
      importVariables: {
        ...acc.importVariables,
        ...conf.importVariables,
      },
    };
  }, { });
}
