import { Type } from "@google/genai";

type GeminiSchema = {
  type: Type;
  description?: string;
  items?: GeminiSchema | GeminiSchema[];
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  enum?: string[];
  nullable?: boolean;
};

type JsonSchema = {
  type: string;
  description?: string;
  items?: JsonSchema | JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
  nullable?: boolean;
};

const mapType = (type: Type): string => {
  const normalized = String(type).toLowerCase();
  if (normalized.includes("object")) return "object";
  if (normalized.includes("array")) return "array";
  if (normalized.includes("integer")) return "integer";
  if (normalized.includes("number") || normalized.includes("double")) return "number";
  if (normalized.includes("boolean")) return "boolean";
  return "string";
};

export const geminiSchemaToJsonSchema = (schema: unknown): JsonSchema | undefined => {
  if (!schema || typeof schema !== "object") {
    return undefined;
  }

  const { type, description, items, properties, required, enum: enumValues, nullable } =
    schema as GeminiSchema;

  if (!type) {
    return undefined;
  }

  const jsonSchema: JsonSchema = {
    type: mapType(type),
  };

  if (description) {
    jsonSchema.description = description;
  }

  if (typeof nullable === "boolean") {
    jsonSchema.nullable = nullable;
  }

  if (Array.isArray(enumValues)) {
    jsonSchema.enum = enumValues;
  }

  if (type === Type.ARRAY && items) {
    if (Array.isArray(items)) {
      jsonSchema.items = items.map(geminiSchemaToJsonSchema).filter(Boolean) as JsonSchema[];
    } else {
      jsonSchema.items = geminiSchemaToJsonSchema(items);
    }
  }

  if (type === Type.OBJECT && properties) {
    jsonSchema.properties = Object.fromEntries(
      Object.entries(properties)
        .map(([key, value]) => [key, geminiSchemaToJsonSchema(value)])
        .filter(([, value]) => Boolean(value)) as [string, JsonSchema][]
    );
  }

  if (Array.isArray(required)) {
    jsonSchema.required = required;
  }

  return jsonSchema;
};
