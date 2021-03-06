import {
  YAMLNode,
  YamlMap as YAMLMap,
  YAMLMapping,
  YAMLSequence,
} from "yaml-ast-parser";
import { MetadataInCompilation, YAMLNumberValueNode, YAMLBooleanValueNode, YAMLStringValueNode } from "./types";
import { NotAllowedValueTypeError, NoRequiredValueError, NotAllowedKeyError, RequiredKeyNotExistError, CompileError } from "./errors";

export type MappingDefinitionOptions<T> = {
  requiredKeys?: (keyof T)[],
};

export type MappingDefinition<T, S, K extends keyof S> = {
  [P in keyof T]: [K, (node: YAMLNode) => S[K]];
};

export function convertMapping<T, S>(node: YAMLNode, map: MappingDefinition<T, S, keyof S>, defaultValue?: Partial<S>, opt?: MappingDefinitionOptions<T>): S {
  const def = map as any;
  if (!node.mappings) {
    throw new NotAllowedValueTypeError(node, "mapping");
  }
  const ret = { } as any;
  const missingKeys = new Set<string>(opt && opt.requiredKeys ? opt.requiredKeys as string[] : []);
  const requiredKeys = new Set<string>(opt && opt.requiredKeys ? opt.requiredKeys as string[] : []);
  node.mappings.forEach((n: YAMLMapping) => {
    const key = n.key.value;
    missingKeys.delete(key);
    if (requiredKeys.has(key)) {
      withValidateNonNullMaping(n);
    }
    const wrap = def[key];
    if (!wrap) {
      throw new NotAllowedKeyError(n.key, key, Object.keys(def));
    }
    const [name, fn] = wrap;
    ret[name] = fn(n.value);
  });
  if (missingKeys.size !== 0) {
    throw new RequiredKeyNotExistError(node as YAMLMap, Array.from(missingKeys.values()));
  }
  if (!defaultValue) return ret as S;
  return Object.assign(defaultValue, ret) as S;
}

export function isSequence(node: YAMLNode): node is YAMLSequence {
  return !!(node as any)["items"]
}

export function hasKey(node: YAMLNode, k: string): node is YAMLMap {
  if (!node.mappings) return false;
  return (node.mappings as any[]).map((v: { key: YAMLNode }) => v.key.value as string).some(key => key === k);
}

export function pick(node: YAMLMap, k: string) {
  const hit = node.mappings.find((n: YAMLMapping) => n.key.value === k);
  if (!hit) return;
  return hit.value;
}

export function normalizeOneOrMany(node: YAMLNode): YAMLNode[] {
  if ((node as YAMLSequence).items) return (node as YAMLSequence).items as YAMLNode[];
  return [node];
}

export function withValidateSequenceType(node: YAMLNode) {
  if (node && (node as any).items) {
    return node as YAMLSequence;
  }
  throw new NotAllowedValueTypeError(node, "sequence");
}

export function withValidateMappingType(node: YAMLNode) {
  if (node && node.mappings) {
    return node as YAMLMap;
  }
  throw new NotAllowedValueTypeError(node, "mapping");
}

export function withValidateNonNullMaping(node: YAMLMapping) {
  if (node && node.value) {
    return node;
  }
  throw new NoRequiredValueError(node);
}

export function withValidateStringType(node: YAMLNode) {
  if (typeof node.value === "string") {
    return node as YAMLStringValueNode;
  }
  throw new NotAllowedValueTypeError(node, "string");
}

export function withValidateNumberType(node: YAMLNode) {
  if ("valueObject" in node && typeof node.valueObject === "number") {
    return node as YAMLNumberValueNode;
  }
  throw new NotAllowedValueTypeError(node, "number");
}

export function withValidateBooleanType(node: YAMLNode) {
  if ("valueObject" in node && typeof node.valueObject === "boolean") {
    return node as YAMLBooleanValueNode;
  }
  throw new NotAllowedValueTypeError(node, "boolean");
}

export function withCatchCompileError<T extends () => any>(fn: T, metadata: MetadataInCompilation, defaultValue: any = { }): ReturnType<T> {
  if (!metadata.catchCompileError) return fn();
  try {
    return fn();
  } catch (e) {
    if (e instanceof CompileError) {
      metadata.pushCompieError(e);
      return defaultValue as ReturnType<T>;
    }
    throw e;
  }
}

export function setMetadata<T>(obj: T, metadata: MetadataInCompilation, node: YAMLNode): T {
  metadata.nodeMap.set(obj, {
    filename: metadata.currentFilename,
    position: {
      start: node.startPosition,
      end: node.endPosition,
    },
  });
  return obj;
}
