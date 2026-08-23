/**
 * HelferleinBild.jsx
 * Das Maskottchen des Pool-Manager-Assistenten („Poolo") in drei Größen.
 */

import React from 'react';

const HELFERLEIN_URL =
  'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/8af50cf1d_generated_image.png';

const SIZES = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-24 h-24',
};

export default function HelferleinBild({ size = 'md', className = '' }) {
  return (
    <img
      src={HELFERLEIN_URL}
      alt="Poolo, das Helferlein des Pool-Managers"
      className={`${SIZES[size] || SIZES.md} shrink-0 object-contain rounded-xl bg-primary/5 ${className}`}
    />
  );
}