import {
  load as loadYaml,
  YAMLNode,
  YAMLSequence,
  YAMLMapping,
} from "yaml-ast-parser";
import * as schema from "../../schema";
import * as models from "../../model";
import { MetadataInCompilation as Metadata } from "../types";
import { setMetadata, mapWithMappingsNode, hasKey, normalizeOneOrMany } from "../yaml-util";
import { createConfigurationModel } from "./configuration";
import { createStepModels } from "./step";


export function isSuiteSchema(node: YAMLNode) {
  return hasKey(node, "scenario");
}
export function createRootModel(node: YAMLNode, metadata: Metadata): models.RootModel {
  if (isSuiteSchema(node)) {
    return setMetadata(mapWithMappingsNode<schema.Suite, models.RootModel>(node, {
      configuration: ["configuration", (n: YAMLNode) => createConfigurationModel(n, metadata)],
      scenario: ["scenarios", (n: YAMLNode) => createScenarioModels(n, metadata)],
    }), metadata, node);
  } else {
    return setMetadata({
      configuration: {},
      scenarios: createScenarioModels(node, metadata),
    } as models.RootModel, metadata, node);
  }
}

export function createScenarioModels(n: YAMLNode, metadata: Metadata): models.Scenario[] {
  return normalizeOneOrMany(n).map(node => {
    return setMetadata(mapWithMappingsNode<schema.Scenario, models.Scenario>(node, {
      configuration: ["configuration", (n: YAMLNode) => createConfigurationModel(n, metadata)],
      description: ["description", (n: YAMLNode) => n.value],
      steps: ["steps", (n: YAMLNode) => createStepModels(n as YAMLSequence, metadata)],
    }), metadata, node);
  });
}