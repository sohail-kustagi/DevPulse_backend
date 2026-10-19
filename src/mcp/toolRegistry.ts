import { z } from 'zod';
import { hudBus } from '../hud/eventBus.js';

export interface DevPulseTool<T = any> {
  name: string;
  description: string;
  parameters: z.ZodType<T, any, any>;
  execute: (args: T) => Promise<any>;
}

export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// Convert a Zod schema to standard JSON Schema compatible with OpenAI Function Calling & MCP
export function zodToJsonSchema(schema: z.ZodSchema<any>): Record<string, any> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodSchema);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: 'string', description: schema.description };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: 'number', description: schema.description };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean', description: schema.description };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element),
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.options,
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) {
    return zodToJsonSchema((schema as any)._def.innerType);
  }

  return { type: 'string' };
}

class ToolRegistry {
  private tools: Map<string, DevPulseTool> = new Map();

  registerTool<T>(tool: DevPulseTool<T>): void {
    this.tools.set(tool.name, tool);
  }

  getToolByName(name: string): DevPulseTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): DevPulseTool[] {
    return Array.from(this.tools.values());
  }

  getOpenAITools(): OpenAIToolDefinition[] {
    return this.getAllTools().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters),
      },
    }));
  }

  async executeToolWithTelemetry(toolOrName: DevPulseTool | string, rawArgs: any): Promise<any> {
    const tool = typeof toolOrName === 'string' ? this.getToolByName(toolOrName) : toolOrName;
    if (!tool) {
      throw new Error(`Tool not found: ${toolOrName}`);
    }

    // Validate parameters
    const parseResult = tool.parameters.safeParse(rawArgs);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      hudBus.emitToolComplete(tool.name, 0, `Validation failed: ${errorMsg}`, false);
      throw new Error(`Invalid arguments for ${tool.name}: ${errorMsg}`);
    }

    const validatedArgs = parseResult.data;
    const startTime = Date.now();

    // Emit live HUD telemetry event: mcp.tool_start
    hudBus.emitToolStart(tool.name, validatedArgs);

    try {
      const result = await tool.execute(validatedArgs);
      const durationMs = Date.now() - startTime;

      // Summary string for live center pane card
      const summary =
        result && typeof result === 'object' && result.summary
          ? result.summary
          : `Executed ${tool.name} in ${durationMs}ms`;

      // Emit live HUD telemetry event: mcp.tool_complete
      hudBus.emitToolComplete(tool.name, durationMs, summary, true);

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      hudBus.emitToolComplete(tool.name, durationMs, `Failed: ${err.message}`, false);
      throw err;
    }
  }
}

export const toolRegistry = new ToolRegistry();
