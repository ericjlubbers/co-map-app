import { useEffect } from "react";
import { toast, Toaster } from "sonner";
import { useDesign } from "../context/DesignContext";

interface Props {
  mapId: string;
}

export default function InstructionalToasts({ mapId }: Props) {
  const { design } = useDesign();

  useEffect(() => {
    if (!design.showInstructionalToasts) return;

    const storageKey = `co-map-toast-v2-${mapId}`;
    if (localStorage.getItem(storageKey)) return;
    // Clean up old v1 key to avoid orphaned localStorage entries
    localStorage.removeItem(`co-map-toast-${mapId}`);

    const isMobile = window.matchMedia("(pointer: coarse)").matches;
    const messages = isMobile
      ? design.toastMessagesMobile
      : design.toastMessagesDesktop;

    if (!messages.length) return;

    localStorage.setItem(storageKey, "1");

    const timers: ReturnType<typeof setTimeout>[] = [];
    messages.forEach((msg, i) => {
      if (!msg.trim()) return;
      const t = setTimeout(
        () => toast(msg, { duration: 5000 }),
        1000 + i * 2500
      );
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [mapId, design.showInstructionalToasts, design.toastMessagesDesktop, design.toastMessagesMobile]);

  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          fontFamily: design.fontFamily,
          fontSize: "0.8rem",
        },
      }}
    />
  );
}
