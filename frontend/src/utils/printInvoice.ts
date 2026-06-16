export function printInvoiceByOrderId(orderId: string) {
  const existingFrame = document.getElementById('invoice-print-frame');
  existingFrame?.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'invoice-print-frame';
  iframe.title = 'In hóa đơn';
  iframe.src = `/invoice?orderId=${encodeURIComponent(orderId)}&autoPrint=1&printOnly=1`;
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  window.setTimeout(() => {
    iframe.remove();
  }, 120000);
}
