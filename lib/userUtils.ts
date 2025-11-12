/**
 * Extracts the name from an email address
 * Example: "hello@gmail.com" -> "Hello"
 * @param email - The email address
 * @returns The formatted name with capital first letter
 */
export function getNameFromEmail(email: string): string {
  if (!email) return '';

  // Extract the part before @
  const username = email.split('@')[0];

  // Capitalize the first letter
  const name = username.charAt(0).toUpperCase() + username.slice(1);

  return name;
}

/**
 * Gets the currently logged-in user's email from localStorage
 * @returns The user's email or empty string if not found
 */
export function getLoggedInUserEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userEmail') || '';
}

/**
 * Saves the logged-in user's email to localStorage
 * @param email - The user's email
 */
export function saveLoggedInUserEmail(email: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('userEmail', email);
}

/**
 * Gets the currently logged-in user's name from their email
 * @returns The formatted name
 */
export function getLoggedInUserName(): string {
  const email = getLoggedInUserEmail();
  return getNameFromEmail(email);
}

/**
 * Extracts the initials from an email address
 * Example: "hello@gmail.com" -> "H"
 * @param email - The email address
 * @returns The uppercase initial letter
 */
export function getInitialsFromEmail(email: string): string {
  if (!email) return '';

  // Extract the part before @
  const username = email.split('@')[0];

  // Get the first letter and uppercase it
  return username.charAt(0).toUpperCase();
}

/**
 * Gets the currently logged-in user's initials from their email
 * @returns The initials
 */
export function getLoggedInUserInitials(): string {
  const email = getLoggedInUserEmail();
  return getInitialsFromEmail(email);
}
