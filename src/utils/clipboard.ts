/**
 * Copies text to the clipboard using the best available method.
 * Handles both secure (HTTPS/localhost) and non-secure (HTTP) contexts.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  // Try using the modern Clipboard API first (requires secure context)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('navigator.clipboard.writeText failed: ', err);
    }
  }

  // Fallback to document.execCommand('copy') for non-secure contexts or failures
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Prevent scrolling to bottom
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed: ', err);
    return false;
  }
};
