/**
 * helper utilities for cookie management
 */

/**
 * get a cookie value by name
 */
export function getCookie(name: string): string | null {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

/**
  * set a cookie with expiry days
 */
export function setCookie(name: string, value: string, days: number): void {
  (function () {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  })();
}

/**
 * set the theme cookie
 */
export function setThemeCookie(themeName: string): void {
  setCookie('beekeeper-theme', themeName, 365); // 1 year
}

/**
 * get the theme cookie
 */
export function getThemeCookie(): string | null {
  return getCookie('beekeeper-theme');
} 
