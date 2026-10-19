/**
 * Sanitizes developer text into clean, safe SSML for Alexa Voice Service (TTS).
 * Converts code symbols, file paths, and acronyms into phonetically natural speech.
 */
export function sanitizeSSML(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '<speak>Ready.</speak>';
  }

  // 1. Remove markdown code blocks, backticks, bold/italic markers
  let text = rawText
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s+/g, '');

  // 2. Translate code symbols into spoken words
  text = text
    .replace(/=>/g, ' arrow ')
    .replace(/!=/g, ' not equal to ')
    .replace(/===?/g, ' equals ')
    .replace(/&&/g, ' and ')
    .replace(/\|\|/g, ' or ')
    .replace(/<=/g, ' less than or equal to ')
    .replace(/>=/g, ' greater than or equal to ')
    .replace(/\.py\b/gi, ' dot P Y ')
    .replace(/\.ts\b/gi, ' dot T S ')
    .replace(/\.js\b/gi, ' dot J S ')
    .replace(/\.json\b/gi, ' dot J S O N ')
    .replace(/\.html\b/gi, ' dot H T M L ');

  // 3. Escape XML/SSML reserved characters
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // 4. Collapse multiple spaces & enforce Alexa 8000 character limit
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > 7800) {
    text = text.substring(0, 7800) + '...';
  }

  return `<speak>${text}</speak>`;
}
