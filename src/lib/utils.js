import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function toDisplayString(str) {
  if (str === null || str === undefined) {
    return "";
  }
  if (typeof str !== 'string') {
    return String(str);
  }
  const result = str.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Calculate similarity score between two strings
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Score between 0 and 1
 */
function calculateStringSimilarity(str1, str2) {
  // Normalize strings: lowercase, remove special chars, convert to array of words
  const normalize = (str) => str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/[\s_-]+/)
    .filter(Boolean);

  const words1 = normalize(str1);
  const words2 = normalize(str2);

  // Check for exact matches after normalization
  if (words1.join(' ') === words2.join(' ')) return 1;

  // Calculate word overlap
  const commonWords = words1.filter(word => words2.includes(word));
  const overlapScore = commonWords.length * 2 / (words1.length + words2.length);

  // Check for substring matches
  const str1Norm = words1.join('');
  const str2Norm = words2.join('');
  const substringScore = str1Norm.includes(str2Norm) || str2Norm.includes(str1Norm) ? 0.8 : 0;

  // Return the higher of the two scores
  return Math.max(overlapScore, substringScore);
}

/**
 * Automatically map form fields to standard fields using fuzzy matching
 * @param {string[]} formFields Array of form field names
 * @param {Object[]} standardFields Array of standard field objects with id and label
 * @param {number} threshold Minimum similarity score to consider a match (0-1)
 * @returns {Object} Mapping of form fields to standard field IDs
 */
export function generateFuzzyFieldMappings(formFields, standardFields, threshold = 0.5) {
  const mappings = {};
  const usedStandardFields = new Set();

  // First pass: Look for high-confidence matches
  formFields.forEach(formField => {
    let bestMatch = null;
    let bestScore = threshold;

    standardFields.forEach(standardField => {
      if (usedStandardFields.has(standardField.id)) return;

      // Check similarity with both id and label
      const scoreWithId = calculateStringSimilarity(formField, standardField.id);
      const scoreWithLabel = calculateStringSimilarity(formField, standardField.label);
      const score = Math.max(scoreWithId, scoreWithLabel);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = standardField;
      }
    });

    if (bestMatch) {
      mappings[formField] = bestMatch.id;
      usedStandardFields.add(bestMatch.id);
    }
  });

  return mappings;
}
