/**
 * Security Utility: URL Defanging
 * Converts active web links into neutral, safe display strings
 * so security analysts never accidentally click on suspected phishing links.
 * 
 * Example:
 * https://phish-login.com/auth -> hxxps://phish-login[.]com/auth
 * http://evil.ru/path          -> hxxp://evil[.]ru/path
 */
export function defangUrl(url) {
  if (!url) return '';
  
  return String(url)
    .replace(/^https?:\/\//i, (match) => {
      return match.toLowerCase().startsWith('https') ? 'hxxps://' : 'hxxp://';
    })
    .replace(/\./g, '[.]');
}
