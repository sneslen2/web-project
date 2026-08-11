/**
 * Usernames, and how they map onto Supabase Auth.
 *
 * Supabase authenticates on an email address -- there is no username column in
 * auth.users to sign in against. This app asks for a username instead, so each
 * one is turned into a synthetic address (`sydney` -> `sydney@christie.local`)
 * before it reaches Supabase, and turned back for display.
 *
 * The domain is a reserved TLD (RFC 2606 `.local`-style, never resolvable), so
 * these addresses cannot collide with real mail or accidentally be sent to.
 *
 * TWO CONSEQUENCES worth knowing:
 *
 *   - Email confirmation must be OFF in the Supabase dashboard
 *     (Authentication -> Providers -> Email). A confirmation link sent to
 *     `@christie.local` can never be delivered or clicked, so with it on, no
 *     account can ever sign in.
 *   - Password reset is impossible. There is no real inbox, so a forgotten
 *     password means the account is unrecoverable without admin action.
 */

/** Domain for synthesized addresses. Not a real, routable domain. */
const USERNAME_DOMAIN = 'christie.local'

/**
 * Allowed usernames: letters, digits, underscore, hyphen, dot; 3-30 chars.
 *
 * Deliberately strict. The result becomes the local part of an email address,
 * so anything Supabase would reject as malformed has to be rejected here first,
 * where the message can name the actual rule.
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,30}$/

/**
 * Validate a username. Returns null when valid, else a message to show.
 *
 * Checked before any network call so a bad username reads as a form error
 * rather than an opaque "Unable to validate email address" from the API.
 */
export function validateUsername(username) {
  const trimmed = username.trim()

  if (!trimmed) return 'Enter a username.'
  if (trimmed.length < 3) return 'Usernames must be at least 3 characters.'
  if (trimmed.length > 30) return 'Usernames must be 30 characters or fewer.'
  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Usernames can contain only letters, numbers, dots, underscores, and hyphens.'
  }
  // A leading or trailing dot makes an invalid email local part.
  if (trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return 'Usernames cannot start or end with a dot.'
  }
  if (trimmed.includes('..')) {
    return 'Usernames cannot contain two dots in a row.'
  }

  return null
}

/**
 * Username -> the address Supabase authenticates against.
 *
 * Lowercased so `Sydney` and `sydney` are the same account rather than two
 * accounts that look identical in the navbar.
 */
export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`
}

/**
 * The address stored on a session -> the username to display.
 *
 * Falls back to the raw value for anything that is not a synthesized address,
 * so an account created before this change still shows something sensible.
 */
export function emailToUsername(email) {
  if (!email) return ''
  return email.endsWith(`@${USERNAME_DOMAIN}`) ? email.slice(0, -`@${USERNAME_DOMAIN}`.length) : email
}
