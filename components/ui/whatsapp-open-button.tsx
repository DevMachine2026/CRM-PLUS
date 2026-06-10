import { ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { whatsappMeUrl } from "@/lib/utils/whatsapp";

type Props = {
  phone: string | null | undefined;
  variant?: "button" | "icon";
  className?: string;
};

export function WhatsAppOpenButton({ phone, variant = "button", className }: Props) {
  const url = whatsappMeUrl(phone);
  if (!url) return null;

  if (variant === "icon") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir no WhatsApp"
        aria-label="Abrir no WhatsApp"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full text-green-600 transition-colors hover:bg-green-50 hover:text-green-700",
          className,
        )}
      >
        <MessageCircle className="h-4 w-4" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex shrink-0", className)}
    >
      <Button
        type="button"
        size="sm"
        className="h-7 gap-1 bg-green-600 px-2.5 text-xs text-white hover:bg-green-700"
      >
        <ExternalLink className="h-3 w-3" />
        Abrir no WhatsApp
      </Button>
    </a>
  );
}
