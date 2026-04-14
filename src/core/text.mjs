function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const normalized = normalizeText(text);

  return normalized.length === 0 ? [] : normalized.split(' ');
}

function phraseMatches(normalizedText, phrase) {
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedPhrase) {
    return false;
  }

  const pattern = new RegExp(`\\b${escapePattern(normalizedPhrase)}\\b`, 'i');

  return pattern.test(normalizedText);
}

function uniqueValues(values) {
  return [...new Set(values)];
}

export { normalizeText, phraseMatches, tokenize, uniqueValues };
