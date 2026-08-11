/**
 * Today as YYYY-MM-DD in the reader's own timezone.
 *
 * Not toISOString().slice(0, 10) -- that converts to UTC first, so a reader in
 * UTC+9 finishing a book on the morning of the 11th would have it stamped the
 * 10th. 'en-CA' is the locale whose short date format is already ISO-shaped.
 *
 * Kept out of ProgressProvider so that file exports only its component and
 * hook: mixing plain helpers in breaks Fast Refresh for the whole module.
 */
export const todayLocal = () => new Date().toLocaleDateString('en-CA')
