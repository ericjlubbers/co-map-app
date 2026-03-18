import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";

interface SidebarGroupProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode: if provided, overrides internal state. */
  open?: boolean;
  onToggle?: () => void;
}

export default function SidebarGroup({
  title,
  children,
  defaultOpen = true,
  open: controlledOpen,
  onToggle,
}: SidebarGroupProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleClick = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen(!internalOpen);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="flex w-full items-center gap-2 border-b border-gray-200 bg-gray-800 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-100 hover:bg-gray-700 transition-colors"
      >
        <FontAwesomeIcon
          icon={isOpen ? faChevronDown : faChevronRight}
          className="text-[9px] text-gray-400"
        />
        {title}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}
