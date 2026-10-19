import { describe, it, expect } from 'vitest';
import { sanitizeSSML } from '../ssml.js';

describe('Alexa SSML Sanitizer', () => {
  it('wraps output in valid speak tags', () => {
    const output = sanitizeSSML('Hello world');
    expect(output).toBe('<speak>Hello world</speak>');
  });

  it('escapes reserved XML characters', () => {
    const output = sanitizeSSML('Test & check <tag> "quote"');
    expect(output).toContain('&amp;');
    expect(output).toContain('&lt;');
    expect(output).toContain('&gt;');
    expect(output).toContain('&quot;');
  });

  it('translates code operators to natural speech', () => {
    const output = sanitizeSSML('a => b && c != d || e.py');
    expect(output).toContain('arrow');
    expect(output).toContain('and');
    expect(output).toContain('not equal to');
    expect(output).toContain('or');
    expect(output).toContain('dot P Y');
  });

  it('handles empty input gracefully', () => {
    expect(sanitizeSSML('')).toBe('<speak>Ready.</speak>');
  });
});
