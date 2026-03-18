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
        className="flex w-full items-center gap-2 bg-gray-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-150 transition-colors"
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
