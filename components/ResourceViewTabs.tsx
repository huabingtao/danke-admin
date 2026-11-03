'use client';
import Image from 'next/image';
import { Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { resolveItemIcon } from '@/lib/item-icons';
import { resourceViews, type ClassificationDictionary } from '@/lib/item-classifications';
export function ResourceViewTabs({ dictionary, value, onChange }: { dictionary: ClassificationDictionary; value: string; onChange: (id: string) => void }) {
 return <TooltipProvider delay={150}><div role="group" aria-label="游戏资源维度" className="flex flex-wrap gap-2">
  {resourceViews(dictionary).map((view) => <Tooltip key={view.id}><TooltipTrigger render={<Button variant={value === view.id ? 'selected' : 'outline'} size="lg" aria-label={view.name} aria-pressed={value === view.id} onClick={() => onChange(view.id)} />}>
   {view.icon ? <Image unoptimized width={26} height={26} src={resolveItemIcon(view.icon)} alt="" /> : <Grid3X3 />}<span>{view.name}</span>
  </TooltipTrigger><TooltipContent>{view.name}</TooltipContent></Tooltip>)}
 </div></TooltipProvider>;
}
