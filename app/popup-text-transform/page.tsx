'use client';

import TextTransformPanel from '@/lib/text-transform/TextTransformPanel';

export default function PopupTextTransformPage() {
  return (
    <TextTransformPanel isPopup onClose={() => window.close()} />
  );
}
