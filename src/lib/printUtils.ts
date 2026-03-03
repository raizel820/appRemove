/**
 * Print Utilities
 *
 * This module provides reusable print functionality for PDF previews.
 * Can be used across multiple components (Invoice, Proforma, Delivery Note, etc.)
 */

/**
 * Print HTML content using a temporary iframe (no new window)
 *
 * @param htmlContent - The HTML content to print
 * @param width - Width of the print area in mm (default: 210mm for A4)
 * @param height - Height of the print area in mm (default: 297mm for A4)
 * @returns Promise that resolves when print is complete
 */
export function printHTMLWithIframe(
  htmlContent: string,
  width: string = '210mm',
  height: string = '297mm'
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary iframe for printing
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'absolute';
      printIframe.style.left = '-9999px';
      printIframe.style.top = '0';
      printIframe.style.width = width;
      printIframe.style.height = height;
      printIframe.style.border = 'none';
      printIframe.style.overflow = 'hidden';
      document.body.appendChild(printIframe);

      // Write HTML to iframe
      const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(printIframe);
        reject(new Error('Failed to access iframe document'));
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Wait for content to load, then print
      setTimeout(() => {
        try {
          if (!printIframe.contentWindow) {
            throw new Error('Iframe contentWindow not available');
          }

          printIframe.contentWindow.print();

          // Remove iframe after printing
          setTimeout(() => {
            try {
              document.body.removeChild(printIframe);
            } catch (e) {
              console.warn('Failed to remove print iframe:', e);
            }
            resolve();
          }, 1000);
        } catch (error) {
          // Clean up iframe on error
          try {
            document.body.removeChild(printIframe);
          } catch (e) {
            console.warn('Failed to remove print iframe after error:', e);
          }
          reject(error);
        }
      }, 200);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Print iframe content directly (for preview dialogs)
 *
 * @param iframe - The iframe element containing the content to print
 * @param isLoaded - Whether the iframe content is fully loaded
 * @returns boolean - true if print was initiated successfully
 */
export function printIframeContent(iframe: HTMLIFrameElement | null, isLoaded: boolean): boolean {
  if (!iframe || !iframe.contentWindow) {
    console.error('Print iframe not ready');
    return false;
  }

  if (!isLoaded) {
    console.error('Iframe content not fully loaded yet');
    return false;
  }

  try {
    iframe.focus();

    // Try to print immediately
    try {
      iframe.contentWindow.print();
      return true;
    } catch (e) {
      console.log('Direct print failed, trying with timeout:', e);
    }

    // If direct print fails, try with a short delay
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print with timeout failed:', e);
      }
    }, 200);

    return true;
  } catch (error) {
    console.error('Error printing iframe:', error);
    return false;
  }
}
