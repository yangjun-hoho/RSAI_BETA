'use client';

import { useState } from 'react';
import { TemplateConfig } from './types';
import TemplateGallery from './TemplateGallery';
import TemplateRunner from './TemplateRunner';

export default function TemplateView({ onClose }: { onClose?: () => void }) {
  const [selected, setSelected] = useState<TemplateConfig | null>(null);

  if (selected) {
    return <TemplateRunner template={selected} onBack={() => setSelected(null)} />;
  }

  return <TemplateGallery onSelect={setSelected} onClose={onClose} />;
}
