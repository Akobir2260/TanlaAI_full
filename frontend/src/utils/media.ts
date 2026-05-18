import { BACKEND_URL } from '../api/client';

/**
 * Ensures that a media URL (logo, product image, etc.) is absolute.
 * If the URL starts with /media/, it prepends the backend base URL.
 */
export const getMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  if (url.startsWith('http')) {
    return url;
  }
  
  if (url.startsWith('/media/')) {
    return `${BACKEND_URL}${url}`;
  }
  
  if (url.startsWith('media/')) {
    return `${BACKEND_URL}/${url}`;
  }
  
  // If it's a relative path without media/ prefix, we assume it's under media/
  if (!url.startsWith('/')) {
    return `${BACKEND_URL}/media/${url}`;
  }
  
  return `${BACKEND_URL}${url}`;
};
