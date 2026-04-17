/**
 * src/services/wordParser.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Parses a .docx file buffer and returns a structured array of questions
 * ready to be rendered on the bulk-upload review page.
 *
 * ── Supported question types ─────────────────────────────────────────────────
 *   mcq          Single-correct MCQ (A–D options)
 *   mcq_multi    Multi-correct MCQ   (A–D options)
 *   numerical    NAT — numeric answer, no options
 *   match_list   Column-A / Column-B matching pairs
 *   paragraph    Passage + sub-questions (each sub-q is its own MCQ/numerical)
 *
 * ── Document format ──────────────────────────────────────────────────────────
 * Each question block is separated by  ---  (three hyphens on its own line).
 * Fields within a block use KEY: value syntax (case-insensitive keys).
 * Images are embedded as Word images and extracted as base64 data-URIs.
 *
 * KEY reference per block:
 *   QUESTION_TYPE : mcq | mcq_multi | numerical | match_list | paragraph
 *   DIFFICULTY    : easy | medium | hard           (default: medium)
 *   MARKS         : integer                        (default: 4)
 *   IDEAL_TIME    : integer (minutes)              (optional)
 *   QUESTION      : question text
 *   QUESTION_IMAGE: position marker — image immediately AFTER this line is used
 *   A) … D)       : MCQ options  (A, B, C, D)
 *   OPTION_IMAGE_A … OPTION_IMAGE_D : position markers for option images
 *   CORRECT       : A | B | C | D  (mcq/mcq_multi — comma-separated for multi)
 *   MATCH         : Left side text | Right side text
 *   EXPLANATION   : explanation text
 *   HINTS         : hints text
 *   PARAGRAPH     : passage text (for paragraph type)
 *   PARAGRAPH_IMAGE: position marker for passage image
 *
 * ── Image handling ───────────────────────────────────────────────────────────
 * mammoth converts embedded Word images to base64 data-URIs.
 * We tag img placeholders in the HTML output and then map them to the nearest
 * QUESTION_IMAGE / OPTION_IMAGE / PARAGRAPH_IMAGE marker above.
 * The returned question objects carry:
 *   question_image_base64   : data-URI or null
 *   paragraph_image_base64  : data-URI or null  (paragraph type only)
 *   options[].option_image_base64 : data-URI or null
 *
 * When the teacher confirms the upload:
 *   - POST /api/bulk-questions/parse-doc  →  returns parsed questions (this file)
 *   - POST /api/bulk-questions/confirm    →  receives parsed questions + module_ids,
 *                                            uploads base64 images to GCS, inserts to DB
 */

import mammoth from 'mammoth';

// ─── image marker keys ───────────────────────────────────────────────────────
const IMAGE_MARKER_KEYS = new Set([
  'QUESTION_IMAGE',
  'PARAGRAPH_IMAGE',
  'OPTION_IMAGE_A',
  'OPTION_IMAGE_B',
  'OPTION_IMAGE_C',
  'OPTION_IMAGE_D',
]);

// ─── Extract images as base64 from the raw docx buffer ───────────────────────
async function extractImages(buffer) {
  // mammoth.convertToHtml inlines images as data-URIs in <img src="data:…">
  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((base64) => ({
          src: `data:${image.contentType};base64,${base64}`,
        }))
      ),
    }
  );

  // Pull every src out of <img> tags in order
  const imgSrcRegex = /<img[^>]+src="([^"]+)"/gi;
  const srcs = [];
  let match;
  while ((match = imgSrcRegex.exec(html)) !== null) {
    srcs.push(match[1]);
  }
  return srcs; // ordered list of base64 data-URIs embedded in the doc
}

// ─── Main parser ─────────────────────────────────────────────────────────────
export async function parseWordFile(buffer) {
  // 1. Get plain text (for field parsing)
  const { value: rawText } = await mammoth.extractRawText({ buffer });

  // 2. Get ordered base64 images from the document
  const imagePool = await extractImages(buffer);
  let imageIndex = 0; // consume images in order they appear in the doc

  // 3. Split into question blocks
  const blocks = rawText
    .split(/\n---+\n?/)
    .map((b) => b.trim())
    .filter(Boolean);

  const questions = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // ── per-question state ────────────────────────────────────────────────
    const q = {
      question_type: null,
      difficulty: 'medium',
      marks: 4,
      module_id: null, // teacher fills this in on the review page
      ideal_time_mins: null,
      question_text: null,
      question_image_base64: null,
      image_position: 'above',
      correct_answer: null,
      explanation: null,
      hints: null,
      options: [],
      // paragraph-specific
      paragraph_text: null,
      paragraph_image_base64: null,
      sub_questions: [],
      // match_list-specific
      match_pairs: [],
    };

    let currentSubQ = null;
    let nextImageTarget = null; // which field the NEXT image in pool goes to

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toUpperCase();
      const value = line.slice(colonIdx + 1).trim();

      // ── image position markers ────────────────────────────────────────
      if (IMAGE_MARKER_KEYS.has(key)) {
        nextImageTarget = key;
        // Immediately consume the next available image from the pool
        if (imageIndex < imagePool.length) {
          const imgSrc = imagePool[imageIndex++];
          assignImage(q, currentSubQ, nextImageTarget, imgSrc);
        }
        continue;
      }

      // ── field parsing ─────────────────────────────────────────────────
      switch (key) {
        case 'QUESTION_TYPE':
          q.question_type = value.toLowerCase();
          break;

        case 'DIFFICULTY':
          q.difficulty = value.toLowerCase();
          break;

        case 'MARKS':
          q.marks = parseInt(value) || 4;
          break;

        case 'IDEAL_TIME':
          q.ideal_time_mins = parseInt(value) || null;
          break;

        case 'PARAGRAPH':
          q.paragraph_text = value;
          break;

        case 'QUESTION':
          if (q.question_type === 'paragraph') {
            // push previous sub-question if any
            if (currentSubQ) q.sub_questions.push(currentSubQ);
            currentSubQ = {
              question_text: value,
              question_image_base64: null,
              options: [],
              correct_answer: null,
              explanation: null,
              hints: null,
            };
          } else {
            q.question_text = value;
          }
          break;

        // MCQ options  A) text
        case 'A':
        case 'B':
        case 'C':
        case 'D': {
          // mammoth strips "A)" to "A" when splitting on ":"
          // but raw text may have "A) option text" — handled below
          const optObj = { letter: key, option_text: value, option_image_base64: null, is_correct: false };
          if (q.question_type === 'paragraph' && currentSubQ) {
            currentSubQ.options.push(optObj);
          } else {
            q.options.push(optObj);
          }
          break;
        }

        case 'CORRECT': {
          // supports  CORRECT: A  or  CORRECT: A,C  (mcq_multi)
          const letters = value
            .split(',')
            .map((l) => l.trim().toUpperCase())
            .filter(Boolean);

          if (q.question_type === 'paragraph' && currentSubQ) {
            currentSubQ.correct_answer = letters.join(',');
            // mark is_correct on options
            currentSubQ.options.forEach((o) => {
              o.is_correct = letters.includes(o.letter);
            });
          } else {
            q.correct_answer = letters.join(',');
            q.options.forEach((o) => {
              o.is_correct = letters.includes(o.letter);
            });
          }
          break;
        }

        case 'MATCH': {
          // MATCH: Left side text | Right side text
          const parts = value.split('|');
          if (parts.length === 2) {
            q.match_pairs.push({ left: parts[0].trim(), right: parts[1].trim() });
          }
          break;
        }

        case 'EXPLANATION':
          if (q.question_type === 'paragraph' && currentSubQ) {
            currentSubQ.explanation = value;
          } else {
            q.explanation = value;
          }
          break;

        case 'HINTS':
          if (q.question_type === 'paragraph' && currentSubQ) {
            currentSubQ.hints = value;
          } else {
            q.hints = value;
          }
          break;

        default:
          // handle  "A) option text"  style lines (mammoth sometimes keeps them together)
          if (/^[A-D]\)/.test(line)) {
            const letter = line[0];
            const optionText = line.replace(/^[A-D]\)\s*/, '').trim();
            const optObj = { letter, option_text: optionText, option_image_base64: null, is_correct: false };
            if (q.question_type === 'paragraph' && currentSubQ) {
              currentSubQ.options.push(optObj);
            } else {
              q.options.push(optObj);
            }
          }
          break;
      }
    }

    // push last sub-question for paragraph type
    if (q.question_type === 'paragraph' && currentSubQ) {
      q.sub_questions.push(currentSubQ);
    }

    questions.push(q);
  }

  return questions;
}

// ─── Helper: route an image src to the right field ───────────────────────────
function assignImage(q, currentSubQ, target, src) {
  switch (target) {
    case 'QUESTION_IMAGE':
      if (q.question_type === 'paragraph' && currentSubQ) {
        currentSubQ.question_image_base64 = src;
      } else {
        q.question_image_base64 = src;
      }
      break;
    case 'PARAGRAPH_IMAGE':
      q.paragraph_image_base64 = src;
      break;
    case 'OPTION_IMAGE_A':
    case 'OPTION_IMAGE_B':
    case 'OPTION_IMAGE_C':
    case 'OPTION_IMAGE_D': {
      const letter = target.slice(-1); // 'A' 'B' 'C' 'D'
      const targetOptions =
        q.question_type === 'paragraph' && currentSubQ ? currentSubQ.options : q.options;
      const opt = targetOptions.find((o) => o.letter === letter);
      if (opt) opt.option_image_base64 = src;
      break;
    }
  }
}