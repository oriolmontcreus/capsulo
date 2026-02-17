import * as React from 'react';
import { Globe, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LocaleSwitcherDropdownProps {
  currentLocale: string;
  locales: { code: string; href: string }[];
}

export function LocaleSwitcherDropdown({ currentLocale, locales }: LocaleSwitcherDropdownProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-[80px] justify-between focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <Globe className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {currentLocale.toUpperCase()}
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {locales.map(({ code, href }) => (
          <DropdownMenuItem key={code} asChild>
            <a href={href} className="flex w-full items-center justify-between cursor-pointer">
              <span>{code.toUpperCase()}</span>
              {currentLocale === code && <Check className="h-4 w-4 opacity-100" />}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
