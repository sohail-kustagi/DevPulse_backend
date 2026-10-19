import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { toolRegistry, zodToJsonSchema, type DevPulseTool } from '../toolRegistry.js';
import { hudBus } from '../../hud/eventBus.js';

describe('MCP Tool Registry & Zod Schema Converter', () => {
  it('zodToJsonSchema converts primitive and object schemas correctly', () => {
    const schema = z.object({
      name: z.string().describe('The name'),
      count: z.number().describe('The count'),
      active: z.boolean(),
      tags: z.array(z.string()),
      mode: z.enum(['read', 'write']),
      optionalField: z.string().optional(),
    });

    const jsonSchema = zodToJsonSchema(schema);

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties.name.type).toBe('string');
    expect(jsonSchema.properties.count.type).toBe('number');
    expect(jsonSchema.properties.active.type).toBe('boolean');
    expect(jsonSchema.properties.tags.type).toBe('array');
    expect(jsonSchema.properties.mode.enum).toEqual(['read', 'write']);
    expect(jsonSchema.required).toContain('name');
    expect(jsonSchema.required).not.toContain('optionalField');
  });

  it('registers and retrieves tools by name', () => {
    const dummyTool: DevPulseTool<{ testArg: string }> = {
      name: 'dummy_test_tool',
      description: 'A test tool',
      parameters: z.object({ testArg: z.string() }),
      execute: async (args) => ({ echo: args.testArg }),
    };

    toolRegistry.registerTool(dummyTool);
    expect(toolRegistry.getToolByName('dummy_test_tool')).toBeDefined();
    expect(toolRegistry.getAllTools().some((t) => t.name === 'dummy_test_tool')).toBe(true);
  });

  it('executeToolWithTelemetry validates input and emits lifecycle events', async () => {
    const startSpy = vi.spyOn(hudBus, 'emitToolStart');
    const completeSpy = vi.spyOn(hudBus, 'emitToolComplete');

    const result = await toolRegistry.executeToolWithTelemetry('dummy_test_tool', {
      testArg: 'orbitops-value',
    });

    expect(result.echo).toBe('orbitops-value');
    expect(startSpy).toHaveBeenCalledWith('dummy_test_tool', { testArg: 'orbitops-value' });
    expect(completeSpy).toHaveBeenCalledWith(
      'dummy_test_tool',
      expect.any(Number),
      expect.any(String),
      true
    );
  });

  it('throws and emits failure telemetry on invalid arguments', async () => {
    const completeSpy = vi.spyOn(hudBus, 'emitToolComplete');

    await expect(
      toolRegistry.executeToolWithTelemetry('dummy_test_tool', {
        testArg: 12345 as any,
      })
    ).rejects.toThrow();

    expect(completeSpy).toHaveBeenCalledWith(
      'dummy_test_tool',
      0,
      expect.stringContaining('Validation failed'),
      false
    );
  });
});
