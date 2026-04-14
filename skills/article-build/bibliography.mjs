import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { loadReferenceCatalog } from './referenceCatalog.mjs';

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeClaimText(text) {
  return normalizeWhitespace(text.toLowerCase().replace(/\[[A-Z0-9-]+\]/g, '').replace(/[^a-z0-9\s-]/g, ' '));
}

function claimId(citationKey, claimText) {
  return createHash('sha1')
    .update(`${citationKey}:${normalizeClaimText(claimText)}`)
    .digest('hex');
}

function stripHtml(html) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  );
}

function splitClaimSentences(paragraph) {
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function extractParagraphBlocks(markdown) {
  const lines = markdown.split('\n');
  const paragraphs = [];
  const buffer = [];
  let inTable = false;
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (buffer.length > 0) {
        paragraphs.push(buffer.join(' '));
        buffer.length = 0;
      }
      inCodeBlock = !inCodeBlock;
      inTable = false;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    if (!trimmed) {
      if (buffer.length > 0) {
        paragraphs.push(buffer.join(' '));
        buffer.length = 0;
      }
      inTable = false;
      continue;
    }

    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('|') ||
      /^\d+\.\s+/.test(trimmed) ||
      trimmed.startsWith('![') ||
      /^\*Figure /.test(trimmed)
    ) {
      if (buffer.length > 0) {
        paragraphs.push(buffer.join(' '));
        buffer.length = 0;
      }
      inTable = trimmed.startsWith('|');
      continue;
    }

    if (inTable) {
      continue;
    }

    buffer.push(trimmed);
  }

  if (buffer.length > 0) {
    paragraphs.push(buffer.join(' '));
  }

  return paragraphs;
}

function extractCitationClaims(chapterFile, markdown) {
  const paragraphs = extractParagraphBlocks(markdown);
  const claims = [];

  for (const paragraph of paragraphs) {
    const sentences = splitClaimSentences(paragraph);

    for (const sentence of sentences) {
      const citations = [...sentence.matchAll(/\[([A-Z0-9-]+)\]/g)].map((match) => match[1]);

      for (const citationKey of citations) {
        claims.push({
          chapterFile,
          citationKey,
          sentence,
          normalizedClaim: normalizeClaimText(sentence)
        });
      }
    }
  }

  return claims;
}

function matchesSupportProfile(claimText, supportProfile) {
  const normalized = normalizeClaimText(claimText);

  return supportProfile.requiredAnyGroups.every((group) =>
    group.some((keyword) => normalized.includes(keyword.toLowerCase()))
  );
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function loadJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function fetchReferenceSource(reference) {
  const response = await fetch(reference.url, {
    headers: {
      'user-agent': 'autoResearchLib/0.1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${reference.url}`);
  }

  const html = await response.text();

  return {
    html,
    text: stripHtml(html)
  };
}

async function ensureReferenceCache(baseDir, references, citationKey, force = false) {
  const reference = references[citationKey];

  if (!reference) {
    throw new Error(`Unknown reference "${citationKey}".`);
  }

  const referenceDir = resolve(baseDir, citationKey);
  const metadataPath = resolve(referenceDir, 'metadata.json');
  const sourceHtmlPath = resolve(referenceDir, 'source.html');
  const sourceTextPath = resolve(referenceDir, 'source.txt');
  const existingMetadata = await loadJson(metadataPath, null);

  await ensureDir(referenceDir);

  if (!force && existingMetadata) {
    return {
      citationKey,
      reference,
      referenceDir,
      metadataPath,
      sourceHtmlPath,
      sourceTextPath,
      checksPath: resolve(referenceDir, 'checks.json')
    };
  }

  let html;
  let text;
  let fetchStatus = 'bootstrap';

  try {
    const fetched = await fetchReferenceSource(reference);
    html = fetched.html;
    text = fetched.text;
    fetchStatus = 'fetched';
  } catch {
    html = `<!-- bootstrap fallback for ${citationKey} -->`;
    text = reference.bootstrapText;
  }

  const sourceDigest = createHash('sha1').update(text).digest('hex');
  const metadata = {
    citationKey,
    url: reference.url,
    title: reference.title,
    fetchedAt: new Date().toISOString(),
    fetchStatus,
    sourceDigest
  };

  await writeFile(sourceHtmlPath, html);
  await writeFile(sourceTextPath, `${text.trim()}\n`);
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  return {
    citationKey,
    reference,
    referenceDir,
    metadataPath,
    sourceHtmlPath,
    sourceTextPath,
    checksPath: resolve(referenceDir, 'checks.json')
  };
}

async function verifyCitationClaims({
  chapters,
  bibliographyDir,
  bibliographyCatalogPath,
  references: preloadedReferences,
  force = false
}) {
  const references = preloadedReferences ?? (await loadReferenceCatalog(bibliographyCatalogPath));
  const allClaims = chapters.flatMap((chapter) => extractCitationClaims(basename(chapter.filePath), chapter.markdown));
  const usedKeys = [...new Set(allClaims.map((claim) => claim.citationKey))];
  const results = [];

  for (const citationKey of usedKeys) {
    const cache = await ensureReferenceCache(bibliographyDir, references, citationKey, force);
    const metadata = await loadJson(cache.metadataPath, null);
    const checks = await loadJson(cache.checksPath, {
      citationKey,
      sourceDigest: metadata?.sourceDigest ?? null,
      checkedClaims: []
    });
    const checksFileExists = await fileExists(cache.checksPath);
    let checksChanged = !checksFileExists;
    const relevantClaims = allClaims.filter((claim) => claim.citationKey === citationKey);

    for (const claim of relevantClaims) {
      const id = claimId(citationKey, claim.sentence);
      const existing = checks.checkedClaims.find(
        (entry) => entry.id === id && entry.sourceDigest === metadata?.sourceDigest && entry.status === 'supported'
      );

      if (existing && !force) {
        results.push({
          citationKey,
          claimText: claim.sentence,
          status: 'cached',
          profileId: existing.profileId,
          chapterFile: claim.chapterFile
        });
        continue;
      }

      const profile = cache.reference.supportProfiles.find((candidate) =>
        matchesSupportProfile(claim.sentence, candidate)
      );

      if (!profile) {
        throw new Error(
          `Citation verification failed for ${citationKey} in ${claim.chapterFile}: "${claim.sentence}". Add a supported claim profile or revise the claim.`
        );
      }

      const record = {
        id,
        claimText: claim.sentence,
        normalizedClaim: claim.normalizedClaim,
        chapterFile: claim.chapterFile,
        status: 'supported',
        profileId: profile.id,
        note: null,
        checkedAt: new Date().toISOString(),
        sourceDigest: metadata?.sourceDigest ?? null
      };
      const existingIndex = checks.checkedClaims.findIndex((entry) => entry.id === id);

      if (existingIndex >= 0) {
        checks.checkedClaims[existingIndex] = record;
      } else {
        checks.checkedClaims.push(record);
      }

      checksChanged = true;

      results.push({
        citationKey,
        claimText: claim.sentence,
        status: 'verified',
        profileId: record.profileId,
        chapterFile: claim.chapterFile
      });
    }

    if (checks.sourceDigest !== (metadata?.sourceDigest ?? null)) {
      checks.sourceDigest = metadata?.sourceDigest ?? null;
      checksChanged = true;
    }

    if (checksChanged) {
      checks.lastValidatedAt = new Date().toISOString();
      await writeFile(cache.checksPath, JSON.stringify(checks, null, 2));
    }
  }

  return {
    bibliographyDir,
    bibliographyCatalogPath,
    references: usedKeys,
    claims: results
  };
}

export { verifyCitationClaims };
