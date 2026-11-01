import React from 'react';
import { Loader2 } from 'lucide-react';
export default function Spinner({ size = 24 }) {
  return <Loader2 className="animate-spin text-indigo-600 mx-auto" size={size} />;
}
