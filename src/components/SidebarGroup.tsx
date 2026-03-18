import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";

interface SidebarGroupProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function SidebarGroup({
  title,
  children,
  defaultOpen = true,
}: SidebarGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 border-b border-gray-200 bg-gray-800 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-100 hover:bg-gray-700 transition-colors"
      >
        <FontAwesomeIcon
          icon={open ? faChevronDown : faChevronRight}
          className="text-[9px] text-gray-400"
        />
        {title}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
