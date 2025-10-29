/**
 * Firestore Utility Functions
 * 
 * Helpers for working with Firestore data
 */

/**
 * Remove undefined values from an object for Firestore compatibility
 * Firestore doesn't accept undefined values - they must be null or omitted
 */
export function sanitizeForFirestore<T extends Record<string, any>>(data: T): Partial<T> {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Convert undefined values to null for Firestore
 */
export function undefinedToNull<T extends Record<string, any>>(data: T): T {
  const result: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    result[key] = value === undefined ? null : value;
  }
  
  return result;
}

