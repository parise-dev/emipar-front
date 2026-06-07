"use client";

import { ClientSheet } from "@/components/atendimento/client-sheet";
import { PaymentDialog } from "@/components/envios/payment-dialog";
import { apiJson } from "@/lib/api";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Check,
  Pause,
  Play,
  CornerDownLeft,
  ChevronDown,
  CheckCheck,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  Filter,
  Loader2,
  MapPinned,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Mic,
  Minimize2,
  MoreVertical,
  PackageCheck,
  Paperclip,
  Phone,
  Search,
  SendHorizonal,
  Settings2,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
} from "lucide-react";

type ChatStatus =
  | "accepted"
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

type ClientPipelineStatus =
  | ""
  | "enviado"
  | "a_pagar"
  | "pago"
  | "calote"
  | "extravio";

type ChatMessage = {
  id: string;
  fromMe: boolean;
  text?: string;
  audioUrl?: string;
  mediaUrl?: string;
  audioBlob?: Blob;
  time: string;
  createdAt?: string;
  status?: ChatStatus;
  type?:
    | "text"
    | "audio"
    | "image"
    | "document"
    | "video"
    | "sticker"
    | "reaction"
    | "location"
    | "contacts"
    | "button"
    | "interactive"
    | "order"
    | "system"
    | "template"
    | "unsupported"
    | "unknown";
  mimeType?: string;
  fileName?: string;

  reactionToWaMessageId?: string;
  reactionTargetText?: string;
  reactionTargetType?: string;
  reactionTargetFromMe?: boolean;
  deleted?: boolean;
  deletedAt?: string;
};

type ToastState = {
  type: "error" | "success";
  message: string;
} | null;

type ChatItem = {
  id: string;
  clientId: string;
  name: string;
  phone: string;
  tag?: string;
  pipelineStatus: ClientPipelineStatus;
  loggi_status?: string;
  loggi_motivo?: string;
  lastMessage: string;
  lastTime: string;
  unread?: number;
  online?: boolean;
  address?: string;
  product?: string;
  amount?: string;
  paymentMethod?: string;
  notes?: string;
  codigo_rastreio?: string;
  messages: ChatMessage[];
};

type WhatsappPaymentContext = {
  id: string;
  nome: string;
  valor_total: number;
};

function parseCurrencyBRToNumber(value?: string) {
  const normalized = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const STATUS_META: Record<
  Exclude<ClientPipelineStatus, "">,
  { label: string; className: string }
> = {
  enviado: {
    label: "Enviado",
    className: "bg-sky-100 text-sky-700 border-sky-200",
  },
  a_pagar: {
    label: "A pagar",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  pago: {
    label: "Pago",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  calote: {
    label: "Calote",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
  extravio: {
    label: "Extravio",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

const mockChatsInitial: ChatItem[] = [
  {
    id: "chat_1",
    clientId: "cli_1",
    name: "Benedito",
    phone: "5511952164377",
    tag: "Pedido 2 ERONMAX",
    pipelineStatus: "a_pagar",
    lastMessage: "Pode entregar nesse endereço mesmo",
    lastTime: "20:00",
    unread: 2,
    online: true,
    address: "Rua José Amadei, 149 - Núcleo Habitacional Buriti - MS",
    product: "2 ERONMAX",
    amount: "R$ 118,00",
    paymentMethod: "Pagamento na entrega",
    notes: "Cliente confirmou endereço. Aguardando cobrança.",
    messages: [
      {
        id: "m1",
        fromMe: true,
        text: "Boa tarde Benedito, tudo bem?",
        time: "14:20",
        status: "read",
        type: "text",
      },
      {
        id: "m2",
        fromMe: true,
        text: "Aqui é o Carlos, da equipe da EMIPAR. Recebemos seu pedido de 2 ERONMAX.",
        time: "14:21",
        status: "read",
        type: "text",
      },
      {
        id: "m3",
        fromMe: true,
        text: "📍 Rua José Amadei, 149 - Núcleo Habitacional Buriti - MS",
        time: "14:21",
        status: "read",
        type: "text",
      },
      {
        id: "m4",
        fromMe: true,
        text: "Você confirma o endereço?",
        time: "14:22",
        status: "read",
        type: "text",
      },
      {
        id: "m5",
        fromMe: false,
        text: "Sim, pode entregar nesse endereço mesmo",
        time: "14:32",
        type: "text",
      },
    ],
  },
  {
    id: "chat_2",
    clientId: "cli_2",
    name: "Marcos Silva",
    phone: "5511999999999",
    tag: "Novo lead",
    pipelineStatus: "",
    lastMessage: "Quero corrigir o número da casa",
    lastTime: "13:10",
    unread: 1,
    address: "Rua Exemplo, 88 - Jardim Magnólia - Patos/PB",
    product: "1 ERONMAX",
    amount: "R$ 69,00",
    paymentMethod: "Pagamento na entrega",
    notes: "Solicitou correção do número da casa.",
    messages: [
      {
        id: "m6",
        fromMe: true,
        text: "Olá Marcos, tudo bem?",
        time: "13:05",
        status: "delivered",
        type: "text",
      },
      {
        id: "m7",
        fromMe: false,
        text: "Quero corrigir o número da casa",
        time: "13:10",
        type: "text",
      },
    ],
  },
  {
    id: "chat_3",
    clientId: "cli_3",
    name: "José Carlos",
    phone: "5511911111111",
    tag: "1 ERONMAX",
    pipelineStatus: "pago",
    lastMessage: "Pagamento realizado",
    lastTime: "11:42",
    unread: 0,
    address: "Av. Central, 500 - São Paulo/SP",
    product: "1 ERONMAX",
    amount: "R$ 59,00",
    paymentMethod: "Pix",
    notes: "Pagamento confirmado.",
    messages: [
      {
        id: "m8",
        fromMe: false,
        text: "Pagamento realizado",
        time: "11:42",
        type: "text",
      },
    ],
  },
];

function MessageStatus({ status }: { status?: ChatStatus }) {
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
        <AlertTriangle className="h-3.5 w-3.5" />
        falhou
      </span>
    );
  }

  if (status === "read") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-sky-600">
        <CheckCheck className="h-4 w-4" />
        lida
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
        <CheckCheck className="h-4 w-4" />
        entregue
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
        <Check className="h-4 w-4" />
        enviada
      </span>
    );
  }

  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
        <Clock3 className="h-3.5 w-3.5" />
        aceita
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
      <Clock3 className="h-3.5 w-3.5" />
      enviando
    </span>
  );
}

function isOutside24hWindow(chat?: ChatItem) {
  if (!chat) return false;

  const lastIncoming = chat.messages
    .filter((m) => !m.fromMe)
    .sort(
      (a, b) =>
        new Date(b.createdAt || "").getTime() -
        new Date(a.createdAt || "").getTime(),
    )[0];

  if (!lastIncoming?.createdAt) return false;

  const diff =
    new Date().getTime() - new Date(lastIncoming.createdAt).getTime();

  return diff > 24 * 60 * 60 * 1000;
}

function formatConversationListDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const diffInMs = today.getTime() - messageDay.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (diffInDays === 1) {
    return "Ontem";
  }

  if (diffInDays > 1 && diffInDays < 7) {
    return date.toLocaleDateString("pt-BR", {
      weekday: "short",
    });
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getMessageFallbackText(item: ChatMessage) {
  if (item.text && item.text.trim()) {
    return item.text;
  }

  if (item.type === "sticker") return "Figurinha recebida";
  if (item.type === "reaction") return "Reação recebida";
  if (item.type === "location") return "Localização recebida";
  if (item.type === "contacts") return "Contato recebido";
  if (item.type === "audio") return "Áudio recebido";
  if (item.type === "image") return "Imagem recebida";
  if (item.type === "document") return "Documento recebido";
  if (item.type === "video") return "Vídeo recebido";
  if (item.type === "button") return "Botão clicado";
  if (item.type === "interactive") return "Resposta interativa";
  if (item.type === "template") return "Template enviado";
  if (item.type === "unsupported") return "Mensagem não suportada";

  return "Mensagem recebida";
}

function ReactionMessageBox({ item }: { item: ChatMessage }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-zinc-800">
        {getMessageFallbackText(item)}
      </div>

      {item.reactionTargetText ? (
        <div className="rounded-xl border-l-4 border-emerald-400 bg-zinc-50 px-3 py-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {item.reactionTargetFromMe
              ? "Reagiu à sua mensagem"
              : "Reagiu à mensagem recebida"}
          </div>

          <div className="line-clamp-3 whitespace-pre-wrap break-words text-xs text-zinc-600">
            {item.reactionTargetText}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-l-4 border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
          Mensagem original não encontrada.
        </div>
      )}
    </div>
  );
}

function ActionCategory({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-visible rounded-3xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        <div>
          <div className="text-sm font-bold text-zinc-900">{title}</div>
          <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div>
        </div>

        <ChevronDown
          className={[
            "h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="relative z-10 space-y-2 border-t border-zinc-100 p-3">
          {children}
        </div>
      )}
    </div>
  );
}

function QuickActionButton({
  icon,
  title,
  description,
  preview,
  loading,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  preview?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "flex w-full items-center gap-3 rounded-2xl border border-zinc-200 p-3 text-left transition hover:bg-zinc-50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
        ) : (
          icon
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-900">
            {title}
          </div>
          <div className="truncate text-xs text-zinc-500">{description}</div>
        </div>
      </button>

      {preview && showPreview && (
        <div className="pointer-events-none fixed left-6 top-28 z-[13000] hidden w-[380px] max-w-[calc(100vw-48px)] rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-xs leading-relaxed text-white shadow-2xl md:block">
          <div className="mb-2 font-bold text-emerald-300">Preview</div>

          <div className="max-h-[360px] overflow-y-auto whitespace-pre-wrap pr-1">
            {preview}
          </div>
        </div>
      )}
    </div>
  );
}

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getAudioBars() {
  return [
    10, 16, 12, 22, 14, 28, 18, 34, 20, 26, 16, 38, 24, 30, 18, 42, 26, 34, 22,
    30, 18, 26, 14, 22, 12, 18, 10, 16, 12, 20, 14, 24, 16, 18,
  ];
}

function WhatsAppAudioPlayer({
  src,
  fromMe,
}: {
  src: string;
  fromMe: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const bars = useMemo(() => getAudioBars(), []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play();
      return;
    }

    audio.pause();
  }

  function toggleSpeed() {
    const audio = audioRef.current;
    if (!audio) return;

    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;

    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }

  function seekByClick(event: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const nextProgress = Math.min(Math.max(x / rect.width, 0), 1);

    audio.currentTime = nextProgress * duration;
    setCurrentTime(audio.currentTime);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handlePlay() {
      setPlaying(true);
    }

    function handlePause() {
      setPlaying(false);
    }

    function handleEnded() {
      setPlaying(false);
      setCurrentTime(0);
    }

    function handleLoadedMetadata() {
      setDuration(audio?.duration || 0);
    }

    function handleTimeUpdate() {
      setCurrentTime(audio?.currentTime || 0);
    }

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [src]);

  return (
    <div
      className={[
        "w-[280px] max-w-[72vw] rounded-[18px] px-3 py-2 shadow-sm",
        fromMe ? "bg-emerald-50/70 text-zinc-800" : "bg-zinc-50 text-zinc-800",
      ].join(" ")}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
            fromMe
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-zinc-700 text-white hover:bg-zinc-800",
          ].join(" ")}
          title={playing ? "Pausar áudio" : "Tocar áudio"}
        >
          {playing ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div
            onClick={seekByClick}
            className="relative flex h-8 cursor-pointer items-center gap-[3px]"
            title="Clique para avançar o áudio"
          >
            {bars.map((height, index) => {
              const barProgress = index / bars.length;
              const active = barProgress <= progress;

              return (
                <span
                  key={index}
                  className={[
                    "wa-audio-bar w-[3px] rounded-full transition-colors",
                    playing ? "wa-audio-bar-playing" : "",
                    active
                      ? fromMe
                        ? "bg-emerald-700"
                        : "bg-zinc-700"
                      : "bg-zinc-300",
                  ].join(" ")}
                  style={{
                    height: `${height}px`,
                    animationDelay: `${index * 0.035}s`,
                  }}
                />
              );
            })}

            <span
              className={[
                "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow",
                fromMe ? "bg-emerald-700" : "bg-zinc-700",
              ].join(" ")}
              style={{
                left: `calc(${progress * 100}% - 7px)`,
              }}
            />
          </div>

          <div className="mt-0.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{formatAudioTime(currentTime)}</span>
            <span>{formatAudioTime(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleSpeed}
          className={[
            "flex h-8 min-w-11 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold transition",
            fromMe
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-zinc-600 text-white hover:bg-zinc-700",
          ].join(" ")}
          title="Alterar velocidade"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}

export default function WhatsAppPage() {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sendingCodigoRastreio, setSendingCodigoRastreio] = useState(false);
  const [sendingConfirmarPedido, setSendingConfirmarPedido] = useState(false);
  const [sendingGlobalAction, setSendingGlobalAction] = useState(false);

  const isSendingAnyAction =
    sendingGlobalAction || sendingCodigoRastreio || sendingConfirmarPedido;

  const [showManualRastreioInput, setShowManualRastreioInput] = useState(false);
  const [manualCodigoRastreio, setManualCodigoRastreio] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "atendimento" | "todos" | "nao_lidas" | ClientPipelineStatus
  >("atendimento");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [todosStartDate, setTodosStartDate] = useState("");
  const [todosEndDate, setTodosEndDate] = useState("");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(
    null,
  );
  const [imageCaption, setImageCaption] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payCtx, setPayCtx] = useState<WhatsappPaymentContext | null>(null);
  const [openActionCategories, setOpenActionCategories] = useState({
    primeiro_atendimento: true,
    cobranca: false,
    outros: false,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToBottomRef = useRef(false);

  const initialUrlParamsHandledRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastUnreadTotalRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const templateStatusRefreshTimersRef = useRef<number[]>([]);

  async function deleteConversationFromView(conversationId: string) {
    if (!selectedChat) return;

    const confirmed = window.confirm("Deseja remover essa conversa?");

    if (!confirmed) return;

    try {
      await apiJson(`/whatsapp/conversations/${conversationId}/delete`, {
        method: "PUT",
      });

      setChats((prev) => prev.filter((chat) => chat.id !== conversationId));
      setSelectedId("");
      setMobileView("list");
      setIsActionsOpen(false);
      setSheetOpen(false);
      setShowManualRastreioInput(false);
      setManualCodigoRastreio("");

      showToast("success", "Conversa removida da visualização.");
    } catch (error) {
      console.error("Erro ao remover conversa:", error);

      const message =
        error instanceof Error ? error.message : "Erro ao remover conversa.";

      showToast("error", message);
    }
  }

  async function loadConversations(options?: { page?: number; append?: boolean }) {
    try {
      setLoadingChats(true);

      const pageToLoad = options?.page || 1;
      const params = new URLSearchParams();
      params.set("filter", statusFilter);
      params.set("page", String(pageToLoad));

      if (statusFilter === "todos") {
        params.set("days", "7");
        params.set("limit", "50");

        if (todosStartDate) {
          params.set("startDate", todosStartDate);
        }

        if (todosEndDate) {
          params.set("endDate", todosEndDate);
        }
      }

      if (["pago", "calote", "extravio"].includes(statusFilter)) {
        params.set("limit", "50");
      }

      if (statusFilter === "atendimento") {
        params.set("atendimentoDays", "3");
      }

      if (search.trim().length >= 3) {
        params.set("q", search.trim());
      }

      const response = await apiJson<{
        success: boolean;
        data: any[];
        pagination?: { page: number; limit: number; total: number; hasMore: boolean };
      }>(`/whatsapp/conversations?${params.toString()}`);

      const mappedChats: ChatItem[] = response.data
        .filter((item) => !item.deleted && !item.deletedAt)
        .sort((a, b) => {
          const dateA = new Date(
            a.lastTime || a.updatedAt || a.createdAt || 0,
          ).getTime();
          const dateB = new Date(
            b.lastTime || b.updatedAt || b.createdAt || 0,
          ).getTime();

          return dateB - dateA;
        })
        .map((item) => ({
          id: item.id,
          clientId: item.clientId || "",
          name: item.name || item.phone,
          phone: item.phone,
          tag: item.product || "",
          pipelineStatus: item.pipelineStatus || "",
          loggi_status: item.loggi_status || "",
          loggi_motivo: item.loggi_motivo || "",
          lastMessage: item.lastMessage || "",
          lastTime: item.lastTime || item.updatedAt || item.createdAt || "",
          unread: item.unread || 0,
          online: false,
          address: item.address || "",
          product: item.product || "",
          amount: item.amount || "",
          paymentMethod: item.paymentMethod || "",
          notes: item.notes || "",
          codigo_rastreio:
            item.codigo_rastreio ||
            item.cod_rastreio ||
            item.rastreio ||
            item.codigoRastreio ||
            "",

          messages: [],
        }));

      setChats((prev) => {
        const mappedWithOldMessages = mappedChats.map((newChat) => {
          const oldChat = prev.find((chat) => chat.id === newChat.id);

          return {
            ...newChat,
            messages: oldChat?.messages || [],
          };
        });

        if (!options?.append) {
          return mappedWithOldMessages;
        }

        const currentById = new Map(prev.map((chat) => [chat.id, chat]));
        mappedWithOldMessages.forEach((chat) => currentById.set(chat.id, chat));

        return Array.from(currentById.values());
      });

      setCurrentPage(pageToLoad);
      setHasMoreChats(Boolean(response.pagination?.hasMore));

      if (!initialUrlParamsHandledRef.current) {
        initialUrlParamsHandledRef.current = true;

        const params = new URLSearchParams(window.location.search);
        const conversationIdFromUrl = params.get("conversationId");
        const phoneFromUrl = params.get("phone");
        const clientIdFromUrl = params.get("clientId");

        const chatFromUrl = mappedChats.find((chat) => {
          return (
            (conversationIdFromUrl && chat.id === conversationIdFromUrl) ||
            (phoneFromUrl && chat.phone === phoneFromUrl) ||
            (clientIdFromUrl && chat.clientId === clientIdFromUrl)
          );
        });

        if (chatFromUrl) {
          setSelectedId(chatFromUrl.id);
          setMobileView("chat");
          loadMessages(chatFromUrl.id, true);
          markConversationAsRead(chatFromUrl.id);

          window.history.replaceState(null, "", "/whatsapp");

          return;
        }
      }
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      setLoadingChats(false);
    }
  }

  function scheduleTemplateStatusRefresh(conversationId: string) {
    if (!conversationId) return;

    const refreshDelays = [2000, 5000, 10000, 20000];

    refreshDelays.forEach((delay) => {
      const timerId = window.setTimeout(async () => {
        await loadMessages(conversationId, false);
        await loadConversations();
      }, delay);

      templateStatusRefreshTimersRef.current.push(timerId);
    });
  }

  function toggleActionCategory(category: keyof typeof openActionCategories) {
    setOpenActionCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }

  async function sendApprovedTemplate({
    templateName,
    variables = [],
    textPreview,
  }: {
    templateName: string;
    variables?: string[];
    textPreview: string;
  }) {
    if (!selectedChat) return;
    if (isSendingAnyAction) return;

    try {
      setSendingGlobalAction(true);

      const response = await apiJson<{
        success: boolean;
        conversationId: string;
        data: any;
      }>("/whatsapp/send-template/generic", {
        method: "POST",
        body: JSON.stringify({
          to: selectedChat.phone,
          clientId: selectedChat.clientId || "",
          conversationId: selectedChat.id,
          templateName,
          variables,
          textPreview,
        }),
      });

      setIsActionsOpen(false);

      showToast(
        "success",
        "Template enviado. Aguardando confirmação do WhatsApp.",
      );

      const conversationIdToRefresh =
        response.conversationId || selectedChat.id;

      await loadMessages(conversationIdToRefresh, true);
      await loadConversations();

      scheduleTemplateStatusRefresh(conversationIdToRefresh);
    } catch (error) {
      console.error(`Erro ao enviar template ${templateName}:`, error);

      const message =
        error instanceof Error ? error.message : "Erro ao enviar template.";

      showToast("error", message);
    } finally {
      setSendingGlobalAction(false);
    }
  }

  async function retryFailedMessage(item: ChatMessage) {
    if (!selectedChat) return;

    if (item.type === "text" && item.text) {
      await appendTextMessageToSelected(item.text);

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                messages: chat.messages.filter((msg) => msg.id !== item.id),
              }
            : chat,
        ),
      );
    }
  }

  function sortMessagesByDate(messages: ChatMessage[]) {
    return [...messages].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      return dateA - dateB;
    });
  }

  async function loadMessages(conversationId: string, shouldScroll = false) {
    try {
      const response = await apiJson<{
        success: boolean;
        data: any[];
      }>(`/whatsapp/conversations/${conversationId}/messages?limit=80`);

      const mappedMessages: ChatMessage[] = response.data
        .filter((msg) => !msg.deleted && !msg.deletedAt)
        .map((msg) => ({
          id: msg.id,
          fromMe: msg.direction === "out",
          text:
            typeof msg.text === "string"
              ? msg.text
              : msg.text?.body || msg.caption || "",
          mediaUrl: msg.mediaId
            ? `https://api.emipar.life/whatsapp/media/${msg.mediaId}`
            : msg.mediaUrl || "",
          audioUrl: msg.mediaId
            ? `https://api.emipar.life/whatsapp/media/${msg.mediaId}`
            : msg.audioUrl || msg.mediaUrl || "",
          mimeType: msg.mimeType || "",
          fileName: msg.fileName || "",
          time: msg.createdAt
            ? new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          createdAt: msg.createdAt || "",
          status: msg.status || "accepted",
          type: msg.type || "unknown",

          reactionToWaMessageId: msg.reactionToWaMessageId || "",
          reactionTargetText: msg.reactionTargetText || "",
          reactionTargetType: msg.reactionTargetType || "",
          reactionTargetFromMe: Boolean(msg.reactionTargetFromMe),
          deleted: Boolean(msg.deleted),
          deletedAt: msg.deletedAt || "",
        }));

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== conversationId) return chat;

          const temporaryMessages = chat.messages.filter(
            (msg) => msg.id.startsWith("temp_") && msg.status === "pending",
          );

          const temporaryMessagesNotYetSynced = temporaryMessages.filter(
            (tempMsg) => {
              const tempKey =
                tempMsg.type === "text" ? tempMsg.text : tempMsg.type;

              return !mappedMessages.some((realMsg) => {
                const realKey =
                  realMsg.type === "text" ? realMsg.text : realMsg.type;

                return realKey === tempKey;
              });
            },
          );

          return {
            ...chat,
            messages: sortMessagesByDate([
              ...mappedMessages,
              ...temporaryMessagesNotYetSynced,
            ]),
          };
        }),
      );
      if (shouldScroll) {
        scrollChatToBottom("smooth");
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  }

  async function markConversationAsRead(conversationId: string) {
    try {
      await apiJson(`/whatsapp/conversations/${conversationId}/read`, {
        method: "PUT",
      });

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === conversationId ? { ...chat, unread: 0 } : chat,
        ),
      );
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
    }
  }

  async function markConversationAsUnread(conversationId: string) {
    try {
      await apiJson(`/whatsapp/conversations/${conversationId}/unread`, {
        method: "PUT",
      });

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === conversationId
            ? {
                ...chat,
                unread: Math.max(chat.unread || 0, 1),
              }
            : chat,
        ),
      );

      showToast("success", "Conversa marcada como não lida.");
    } catch (error) {
      console.error("Erro ao marcar como não lido:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Erro ao marcar conversa como não lida";

      showToast("error", message);
    }
  }

  const filteredChats = useMemo(() => {
    const term = search.trim().toLowerCase();

    return chats.filter((chat) => {
      const matchesSearch =
        !term ||
        chat.name.toLowerCase().includes(term) ||
        chat.phone.toLowerCase().includes(term) ||
        (chat.tag || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "todos" ||
        statusFilter === "atendimento" ||
        (statusFilter === "nao_lidas" && (chat.unread || 0) > 0) ||
        chat.pipelineStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, chats]);

  const selectedChat = chats.find((chat) => chat.id === selectedId) ?? null;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "24px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [message]);

  useEffect(() => {
    if (!isRecording) return;

    const interval = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const debounce = window.setTimeout(() => {
      loadConversations({ page: 1, append: false });
    }, search.trim() ? 350 : 0);

    return () => window.clearTimeout(debounce);
  }, [statusFilter, search, todosStartDate, todosEndDate]);

  useEffect(() => {
    return () => {
      templateStatusRefreshTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });

      templateStatusRefreshTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId, true);
      markConversationAsRead(selectedId);
    }
  }, [selectedId]);

 useEffect(() => {
  if (!selectedId) return;

  const interval = window.setInterval(() => {
    loadMessages(selectedId, false);
  }, 5000);

  return () => window.clearInterval(interval);
}, [selectedId]);

  function scrollChatToBottom(behavior: ScrollBehavior = "auto") {
    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 50);
  }

  function getCurrentTime() {
    return new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getNowISO() {
    return new Date().toISOString();
  }

  function getDateKey(dateString?: string) {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function getDateLabel(dateString?: string) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateKey = getDateKey(dateString);
    const todayKey = getDateKey(today.toISOString());
    const yesterdayKey = getDateKey(yesterday.toISOString());

    if (dateKey === todayKey) return "Hoje";
    if (dateKey === yesterdayKey) return "Ontem";

    return date.toLocaleDateString("pt-BR");
  }

  function formatRecordingTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  async function appendTextMessageToSelected(text: string) {
    if (!selectedChat) return;

    const currentSelectedChat = selectedChat;

    setMessage("");
    setIsActionsOpen(false);

    scrollChatToBottom("smooth");

    try {
      const response = await apiJson<{
        success: boolean;
        conversationId: string;
        data: any;
      }>("/whatsapp/send-text", {
        method: "POST",
        body: JSON.stringify({
          to: currentSelectedChat.phone,
          message: text,
          clientId: currentSelectedChat.clientId,
          conversationId: currentSelectedChat.id,
        }),
      });

      await loadMessages(
        response.conversationId || currentSelectedChat.id,
        true,
      );

      await loadConversations();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Erro ao enviar mensagem";

      showToast("error", errorMessage);
    }
  }

  function appendAudioMessageToSelected(blob: Blob, url: string) {
    if (!selectedChat) return;

    const time = getCurrentTime();

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== selectedChat.id) return chat;

        const newMessage: ChatMessage = {
          id: `temp_audio_${Date.now()}`,
          fromMe: true,
          audioUrl: url,
          audioBlob: blob,
          time,
          createdAt: getNowISO(),
          status: "pending",
          type: "audio",
        };

        return {
          ...chat,
          lastMessage: "🎤 Áudio",
          lastTime: time,
          messages: [...chat.messages, newMessage],
        };
      }),
    );
  }

  async function updateSelectedPipelineStatus(newStatus: ClientPipelineStatus) {
    if (!selectedChat) return;

    if (newStatus === "pago") {
      if (!selectedChat.clientId) {
        showToast(
          "error",
          "Não foi possível confirmar o pagamento: conversa sem cliente vinculado.",
        );
        return;
      }

      setPayCtx({
        id: selectedChat.clientId,
        nome: selectedChat.name,
        valor_total: parseCurrencyBRToNumber(selectedChat.amount),
      });

      setPayOpen(true);
      setIsActionsOpen(false);
      return;
    }

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === selectedChat.id
          ? {
              ...chat,
              pipelineStatus: newStatus,
            }
          : chat,
      ),
    );

    setIsActionsOpen(false);

    try {
      if (selectedChat.clientId) {
        if (newStatus === "calote") {
          await apiJson(`/clientes/${selectedChat.clientId}`, {
            method: "PUT",
            body: JSON.stringify({
              status_pagamento: "Não Pago",
            }),
          });

          await loadConversations();
          return;
        }

        if (newStatus === "extravio") {
          await apiJson(`/clientes/${selectedChat.clientId}`, {
            method: "PUT",
            body: JSON.stringify({
              status_pagamento: "Extravio",
              loggi_motivo: "Cliente não recebeu",
            }),
          });

          await loadConversations();
          return;
        }

        if (newStatus === "a_pagar") {
          await apiJson(`/clientes/${selectedChat.clientId}`, {
            method: "PUT",
            body: JSON.stringify({
              status_pagamento: "Pendente",
            }),
          });

          await loadConversations();
          return;
        }
      }

      await apiJson(`/whatsapp/conversations/${selectedChat.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          pipelineStatus: newStatus,
        }),
      });

      await loadConversations();
    } catch (error) {
      console.error("Erro ao atualizar andamento:", error);

      const message =
        error instanceof Error ? error.message : "Erro ao atualizar andamento.";

      showToast("error", message);
    }
  }

  async function confirmarPagamentoWhatsapp(payload: {
    valor_pago?: number;
    data_pagamento: string;
    origem_pagamento: string;
  }) {
    if (!payCtx) return;

    const dataISO = payload.data_pagamento
      ? new Date(`${payload.data_pagamento}T12:00:00-03:00`).toISOString()
      : new Date().toISOString();

    try {
      await apiJson(`/clientes/${payCtx.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status_pagamento: "Pago",
          data_pagamento: dataISO,
          origem_pagamento: payload.origem_pagamento,
          valor_pago: payload.valor_pago,
        }),
      });

      setChats((prev) =>
        prev.map((chat) =>
          chat.clientId === payCtx.id
            ? {
                ...chat,
                pipelineStatus: "pago",
              }
            : chat,
        ),
      );

      setPayOpen(false);
      setPayCtx(null);

      await loadConversations();

      showToast("success", "Pagamento confirmado com sucesso.");
    } catch (error) {
      console.error("Erro ao confirmar pagamento pelo WhatsApp:", error);

      const message =
        error instanceof Error ? error.message : "Erro ao confirmar pagamento.";

      showToast("error", message);
    }
  }

  function handleSendTypedMessage() {
    const text = capitalizeFirstLetter(message.trim());
    if (!text) return;
    appendTextMessageToSelected(text);
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendTypedMessage();
    }
  }

  function capitalizeFirstLetter(value: string) {
    const firstLetterIndex = value.search(/[A-Za-zÀ-ÖØ-öø-ÿ]/);

    if (firstLetterIndex === -1) {
      return value;
    }

    return (
      value.slice(0, firstLetterIndex) +
      value.charAt(firstLetterIndex).toUpperCase() +
      value.slice(firstLetterIndex + 1)
    );
  }

  function handleMessageChange(value: string) {
    setMessage(capitalizeFirstLetter(value));
  }

  async function handleStartRecording() {
    try {
      setAudioPreviewUrl(null);
      setAudioBlob(null);
      setRecordingSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioPreviewUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      alert("Não foi possível acessar o microfone do navegador.");
    }
  }

  function handleStopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    setIsRecording(false);
  }

  function handleCancelRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioBlob(null);

    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
  }

  async function handleSendAudio() {
    if (!audioBlob || !audioPreviewUrl || !selectedChat) return;

    const currentAudioBlob = audioBlob;
    const currentAudioPreviewUrl = audioPreviewUrl;
    const currentSelectedChat = selectedChat;

    appendAudioMessageToSelected(currentAudioBlob, currentAudioPreviewUrl);

    const formData = new FormData();

    formData.append("audio", currentAudioBlob, `audio-${Date.now()}.webm`);
    formData.append("to", currentSelectedChat.phone);
    formData.append("clientId", currentSelectedChat.clientId || "");
    formData.append("conversationId", currentSelectedChat.id);

    try {
      const response = await fetch(
        "https://api.emipar.life/whatsapp/send-audio",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Erro API send-audio:", data);
        throw new Error(data?.error || "Erro ao enviar áudio");
      }

      setAudioBlob(null);
      setAudioPreviewUrl(null);
      setRecordingSeconds(0);

      await loadConversations();

      window.setTimeout(() => {
        loadMessages(currentSelectedChat.id, true);
      }, 1500);
    } catch (error) {
      console.error("Erro ao enviar áudio para API:", error);

      const message =
        error instanceof Error ? error.message : "Erro ao enviar áudio";

      alert(message);
    }
  }

  async function handleSendImage(file: File, caption = "") {
    if (!selectedChat) return;
    if (isSendingAnyAction && !sendingGlobalAction) return;
    const previewUrl = URL.createObjectURL(file);
    const time = getCurrentTime();
    const tempMessageId = `temp_image_${Date.now()}`;

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== selectedChat.id) return chat;

        const newMessage: ChatMessage = {
          id: tempMessageId,
          fromMe: true,
          text: caption,
          mediaUrl: previewUrl,
          time,
          createdAt: getNowISO(),
          status: "pending",
          type: "image",
          mimeType: file.type,
          fileName: file.name,
        };

        return {
          ...chat,
          lastMessage: caption || "🖼️ Imagem",
          lastTime: time,
          messages: [...chat.messages, newMessage],
        };
      }),
    );

    const formData = new FormData();
    formData.append("image", file);
    formData.append("to", selectedChat.phone);
    formData.append("clientId", selectedChat.clientId || "");
    formData.append("conversationId", selectedChat.id);
    formData.append("caption", caption);

    try {
      setSendingGlobalAction(true);
      const response = await fetch(
        "https://api.emipar.life/whatsapp/send-image",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Erro ao enviar imagem");
      }

      await loadConversations();

      window.setTimeout(() => {
        loadMessages(selectedChat.id, true);
      }, 1500);
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      showToast("error", "Erro ao enviar imagem");
    } finally {
      setSendingGlobalAction(false);
    }
  }

  async function sendPresetImageWithCaption() {
    if (!selectedChat) return;
    if (isSendingAnyAction) return;

    try {
      setSendingGlobalAction(true);

      const imagePath = "/images/atalhos/pedido-embalando.jpg";

      const response = await fetch(imagePath);
      const blob = await response.blob();

      const file = new File([blob], "pedido-embalando.jpg", {
        type: blob.type || "image/jpeg",
      });

      const caption =
        "Acabei de pedir para as meninas aqui no escritório embalar seu pedido ✅🙏";

      await handleSendImage(file, caption);

      setIsActionsOpen(false);
    } catch (error) {
      console.error("Erro ao enviar imagem pronta:", error);
      showToast("error", "Erro ao enviar imagem pronta.");
    } finally {
      setSendingGlobalAction(false);
    }
  }

  async function handleSendDocument(file: File) {
    if (!selectedChat) return;
    if (isSendingAnyAction) return;
    const previewUrl = URL.createObjectURL(file);
    const time = getCurrentTime();
    const tempMessageId = `temp_document_${Date.now()}`;

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== selectedChat.id) return chat;

        const newMessage: ChatMessage = {
          id: tempMessageId,
          fromMe: true,
          text: `📄 ${file.name}`,
          mediaUrl: previewUrl,
          time,
          createdAt: getNowISO(),
          status: "pending",
          type: "document",
          mimeType: file.type,
          fileName: file.name,
        };

        return {
          ...chat,
          lastMessage: `📄 ${file.name}`,
          lastTime: time,
          messages: [...chat.messages, newMessage],
        };
      }),
    );

    const formData = new FormData();
    formData.append("document", file);
    formData.append("to", selectedChat.phone);
    formData.append("clientId", selectedChat.clientId || "");
    formData.append("conversationId", selectedChat.id);
    formData.append("caption", "");

    try {
      setSendingGlobalAction(true);
      const response = await fetch(
        "https://api.emipar.life/whatsapp/send-document",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Erro ao enviar documento");
      }

      await loadConversations();

      window.setTimeout(() => {
        loadMessages(selectedChat.id, true);
      }, 1500);
    } catch (error) {
      console.error("Erro ao enviar documento:", error);
      showToast("error", "Erro ao enviar documento");
    } finally {
      setSendingGlobalAction(false);
    }
  }

  async function sendPresetAudio(audioPath: string) {
    if (!selectedChat) return;
    if (isSendingAnyAction) return;

    try {
      setSendingGlobalAction(true);

      const audioResponse = await fetch(audioPath);
      const blob = await audioResponse.blob();

      const file = new File([blob], "audio-pronto.ogg", {
        type: "audio/ogg",
      });

      const previewUrl = URL.createObjectURL(file);
      appendAudioMessageToSelected(file, previewUrl);

      shouldScrollToBottomRef.current = true;
      scrollChatToBottom("smooth");

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("to", selectedChat.phone);
      formData.append("clientId", selectedChat.clientId || "");
      formData.append("conversationId", selectedChat.id);

      const response = await fetch(
        "https://api.emipar.life/whatsapp/send-audio",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Erro API send-audio:", data);
        throw new Error(data?.error || "Erro ao enviar áudio pronto");
      }

      setIsActionsOpen(false);

      await loadMessages(selectedChat.id, true);
      await loadConversations();

      shouldScrollToBottomRef.current = true;

      window.setTimeout(() => {
        scrollChatToBottom("smooth");
      }, 200);
    } catch (error) {
      console.error("Erro ao enviar áudio pronto:", error);

      const message =
        error instanceof Error ? error.message : "Erro ao enviar áudio pronto";

      showToast("error", message);
    } finally {
      setSendingGlobalAction(false);
    }
  }

  function parseEndereco(address?: string) {
    const fallback = {
      rua: "Endereço não informado",
      cidade: "Cidade não informada",
      numero: "S/N",
    };

    if (!address) return fallback;

    const partes = address.split(",").map((p) => p.trim());

    return {
      rua: partes[0] || fallback.rua,
      numero:
        partes[1]?.replace("n°", "").replace("N:", "").trim() ||
        fallback.numero,
      cidade: partes.slice(2).join(", ") || partes[1] || fallback.cidade,
    };
  }

  function showToast(type: "error" | "success", message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({
      type,
      message,
    });

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  }

  async function sendConfirmarPedidoTemplate() {
    if (!selectedChat) return;

    if (sendingConfirmarPedido) return;

    const endereco = parseEndereco(selectedChat.address);

    try {
      setSendingConfirmarPedido(true);

      await apiJson<{
        success: boolean;
        conversationId: string;
        data: any;
      }>("/whatsapp/send-template/confirmar-pedido", {
        method: "POST",
        body: JSON.stringify({
          to: selectedChat.phone,
          clientId: selectedChat.clientId || "",
          conversationId: selectedChat.id,
          nome: selectedChat.name,
          nome_rep: "Carlos",
          emprs: "EMIPAR LIFE",
          qtd: selectedChat.product || selectedChat.tag || "1 ERONMAX",
          rua: endereco.rua,
          cidade: endereco.cidade,
          n: endereco.numero,
        }),
      });

      setIsActionsOpen(false);

      showToast(
        "success",
        "Template de confirmação enviado. Aguardando confirmação do WhatsApp.",
      );

      await loadMessages(selectedChat.id, true);
      await loadConversations();
      scheduleTemplateStatusRefresh(selectedChat.id);
    } catch (error) {
      console.error("Erro ao enviar template confirmar_pedido:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Erro ao enviar template de confirmação de pedido";

      showToast("error", message);
    } finally {
      setSendingConfirmarPedido(false);
    }
  }

  async function sendCodigoRastreioTemplate(codigoManual?: string) {
    if (!selectedChat) return;

    if (sendingCodigoRastreio) return;

    const codigoRastreio =
      codigoManual?.trim() || selectedChat.codigo_rastreio?.trim() || "";

    const hasClientId = Boolean(selectedChat.clientId);

    if (!codigoRastreio && !hasClientId) {
      setShowManualRastreioInput(true);
      setManualCodigoRastreio("");

      showToast(
        "error",
        "Código de rastreio não encontrado. Digite manualmente para enviar.",
      );

      return;
    }

    if (!codigoRastreio && hasClientId) {
      try {
        setSendingCodigoRastreio(true);

        const response = await apiJson<{
          success: boolean;
          conversationId: string;
          data: any;
        }>("/whatsapp/send-template/cod-rastreio", {
          method: "POST",
          body: JSON.stringify({
            to: selectedChat.phone,
            clientId: selectedChat.clientId || "",
            conversationId: selectedChat.id,
            nome: selectedChat.name,
            codigo_rastreio: "",
          }),
        });

        setIsActionsOpen(false);
        setShowManualRastreioInput(false);
        setManualCodigoRastreio("");

        showToast(
          "success",
          "Template de rastreio enviado. Aguardando confirmação do WhatsApp.",
        );

        const conversationIdToRefresh =
          response.conversationId || selectedChat.id;

        await loadMessages(conversationIdToRefresh, true);
        await loadConversations();

        scheduleTemplateStatusRefresh(conversationIdToRefresh);

        return;
      } catch (error) {
        console.error("Erro ao buscar/enviar rastreio pelo cliente:", error);

        const message =
          error instanceof Error
            ? error.message
            : "Código de rastreio não encontrado. Digite manualmente para enviar.";

        setShowManualRastreioInput(true);
        setManualCodigoRastreio("");

        showToast("error", message);

        return;
      } finally {
        setSendingCodigoRastreio(false);
      }
    }

    try {
      setSendingCodigoRastreio(true);

      const response = await apiJson<{
        success: boolean;
        conversationId: string;
        data: any;
      }>("/whatsapp/send-template/cod-rastreio", {
        method: "POST",
        body: JSON.stringify({
          to: selectedChat.phone,
          clientId: selectedChat.clientId || "",
          conversationId: selectedChat.id,
          nome: selectedChat.name,
          codigo_rastreio: codigoRastreio,
        }),
      });

      setIsActionsOpen(false);
      setShowManualRastreioInput(false);
      setManualCodigoRastreio("");

      showToast(
        "success",
        "Template de rastreio enviado. Aguardando confirmação do WhatsApp.",
      );

      const conversationIdToRefresh =
        response.conversationId || selectedChat.id;

      await loadMessages(conversationIdToRefresh, true);
      await loadConversations();

      scheduleTemplateStatusRefresh(conversationIdToRefresh);
    } catch (error) {
      console.error("Erro ao enviar template cod_rastreio:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Erro ao enviar template de rastreio";

      showToast("error", message);
    } finally {
      setSendingCodigoRastreio(false);
    }
  }

  function handleEnviarCodigoRastreioManual() {
    const codigo = manualCodigoRastreio.trim();

    if (!codigo) {
      showToast("error", "Digite o código de rastreio antes de enviar.");
      return;
    }

    sendCodigoRastreioTemplate(codigo);
  }

  const selectedStatusMeta = selectedChat?.pipelineStatus
    ? STATUS_META[
        selectedChat.pipelineStatus as Exclude<ClientPipelineStatus, "">
      ]
    : null;

  const enderecoSelecionado = selectedChat
    ? parseEndereco(selectedChat.address)
    : {
        rua: "Endereço não informado",
        cidade: "Cidade não informada",
        numero: "S/N",
      };

  const nomeCliente = selectedChat?.name || "Cliente";
  const nomeAtendente = "Carlos";
  const empresaNome = "EMIPAR LIFE";
  const produtoPedido =
    selectedChat?.product || selectedChat?.tag || "1 ERONMAX";

  const previewConfirmandoEndereco1 = `Olá, ${nomeCliente}!
Aqui é o ${nomeAtendente}, da equipe da ${empresaNome}. Recebemos seu pedido de ${produtoPedido} e ele será entregue no endereço abaixo:

📍 Rua: ${enderecoSelecionado.rua}, ${enderecoSelecionado.cidade}, n° ${enderecoSelecionado.numero}

Você confirma o endereço?`;

  const previewConfirmandoEndereco2 = `Olá ${nomeCliente}, tudo bem? Aqui é o ${nomeAtendente}, responsável pelo atendimento ao cliente da EMIPAR. Estou passando para avisar que seu pedido de *${produtoPedido}* será entregue no endereço abaixo:

📍 *Rua: ${enderecoSelecionado.rua}, ${enderecoSelecionado.cidade}, n° ${enderecoSelecionado.numero}*

Correto?`;

  const previewConfirmEndereco = "CONFIRMA O ENDEREÇO?";

  const previewChamarCliente = `Oi ${nomeCliente}, tudo bem? Não consegui localizar seu endereço... Pode me confirmar o CEP?`;

  const previewFalarUrg = `Oi ${nomeCliente}, preciso falar com você urgente! Responde aqui por favor...`;

  const previewCobranca1 = `Oi ${nomeCliente}, seu pedido consta como entregue. Você confirma o recebimento?`;

  const previewCobranca2 = "SIM OU NÃO?";

  const previewCobranca3 =
    "Cara você vai ficar ignorando nossa mensagem? Quero resolver numa boa, não quero ter que abrir boletim de ocorrência pra resolver a situação….";

  const previewCobrancaPendente = `Oi ${nomeCliente}, tudo certo com o pagamento amanhã?`;

  const previewCobPendente2 = "Deixei avisado no financeiro";

  const previewCobPendente3 = `Oi ${nomeCliente}, está confirmado pra amanhã?`;

  return (
    <>
      <style jsx global>{`
        .wa-audio-bar {
          transform-origin: center;
        }

        .wa-audio-bar-playing {
          animation: waAudioPulse 0.72s ease-in-out infinite;
        }

        @keyframes waAudioPulse {
          0%,
          100% {
            transform: scaleY(0.65);
            opacity: 0.75;
          }

          50% {
            transform: scaleY(1.18);
            opacity: 1;
          }
        }
      `}</style>
      {isSendingAnyAction && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/60 bg-white shadow-2xl">
            <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed right-5 top-5 z-[11000] w-[calc(100%-40px)] max-w-md">
          <div
            className={[
              "rounded-2xl border px-4 py-3 shadow-xl backdrop-blur",
              toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  toast.type === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700",
                ].join(" ")}
              >
                {toast.type === "error" ? "!" : "✓"}
              </div>

              <div className="flex-1">
                <div className="text-sm font-semibold">
                  {toast.type === "error" ? "Atenção" : "Sucesso"}
                </div>

                <div className="mt-0.5 text-sm leading-relaxed">
                  {toast.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-lg px-2 py-1 text-sm opacity-70 transition hover:bg-black/5 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* resto do seu layout atual aqui */}

      <div
        className={[
          isFullscreen
            ? "fixed inset-0 z-[9999] overflow-hidden bg-white p-2 md:p-4"
            : "h-[calc(100vh-105px)] overflow-hidden",
        ].join(" ")}
      >
        <div
          className={[
            "h-full overflow-hidden border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]",
            isFullscreen ? "rounded-2xl" : "rounded-[28px]",
          ].join(" ")}
        >
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside
              className={[
                "min-h-0 flex-col border-r border-zinc-200 bg-white",
                mobileView === "list" ? "flex" : "hidden",
                "lg:flex",
              ].join(" ")}
            >
              <div className="shrink-0 border-b border-zinc-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-zinc-900">
                      Conversas
                    </div>
                    <div className="text-xs text-zinc-500">
                      {filteredChats.length} conversa(s)
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-600 transition hover:bg-zinc-100"
                    title="Tela cheia"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-5 w-5" />
                    ) : (
                      <Maximize2 className="h-5 w-5" />
                    )}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                      title="Filtrar conversas"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {isFilterMenuOpen && (
                      <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Filtrar conversas
                        </div>

                        {(
                          [
                            "atendimento",
                            "nao_lidas",
                            "enviado",
                            "a_pagar",
                            "pago",
                            "calote",
                            "extravio",
                            "todos",
                          ] as const
                        ).map((status) => {
                          const active = statusFilter === status;
                          const label =
                            status === "atendimento"
                              ? "Atendimento"
                              : status === "todos"
                                ? "Todos"
                                : status === "nao_lidas"
                                  ? "Não lidas"
                                  : STATUS_META[
                                      status as Exclude<ClientPipelineStatus, "">
                                    ].label;

                          return (
                            <button
                              key={status}
                              onClick={() => {
                                setStatusFilter(status);
                                setCurrentPage(1);
                                setHasMoreChats(false);
                                setIsFilterMenuOpen(false);
                              }}
                              className={[
                                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                                active
                                  ? "bg-zinc-900 font-semibold text-white"
                                  : "text-zinc-700 hover:bg-zinc-100",
                              ].join(" ")}
                            >
                              <span>{label}</span>

                              {active && <Check className="h-4 w-4" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <label className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cliente, telefone ou tag..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                  />
                </label>

                {statusFilter === "todos" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Início
                      <input
                        type="date"
                        value={todosStartDate}
                        onChange={(e) => {
                          setTodosStartDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700 outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Fim
                      <input
                        type="date"
                        value={todosEndDate}
                        onChange={(e) => {
                          setTodosEndDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700 outline-none"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredChats.map((chat) => {
                  const active = selectedChat?.id === chat.id;
                  const pipelineMeta = chat.pipelineStatus
                    ? STATUS_META[
                        chat.pipelineStatus as Exclude<ClientPipelineStatus, "">
                      ]
                    : null;
                  const hasUnread = (chat.unread || 0) > 0;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setSelectedId(chat.id);
                        setMobileView("chat");
                        loadMessages(chat.id, true);
                        markConversationAsRead(chat.id);
                      }}
                      className={[
                        "relative w-full border-b px-4 py-4 text-left transition",
                        active
                          ? "border-l-4 border-l-emerald-600 border-b-emerald-100 bg-emerald-100/80 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.16)]"
                          : hasUnread
                            ? "border-l-4 border-l-transparent border-b-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/70"
                            : "border-l-4 border-l-transparent border-b-zinc-100 bg-white hover:bg-zinc-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 font-semibold text-emerald-700">
                          {chat.name.slice(0, 1)}
                          {chat.online && (
                            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={[
                                "truncate",
                                hasUnread
                                  ? "font-bold text-zinc-950"
                                  : "font-semibold text-zinc-900",
                              ].join(" ")}
                            >
                              {chat.name}
                            </div>
                            <div className="shrink-0 text-xs text-zinc-500">
                              {formatConversationListDate(chat.lastTime)}
                            </div>
                          </div>

                          <div
                            className={[
                              "mt-1 truncate text-sm",
                              hasUnread
                                ? "font-semibold text-zinc-800"
                                : "text-zinc-500",
                            ].join(" ")}
                          >
                            {chat.lastMessage}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-col gap-1">
                              <div className="truncate text-xs text-zinc-400">
                                {chat.tag || chat.phone}
                              </div>
                              {pipelineMeta && (
                                <span
                                  className={`inline-flex w-fit rounded-full border px-2 py-1 text-[10px] font-semibold ${pipelineMeta.className}`}
                                >
                                  {pipelineMeta.label}
                                </span>
                              )}
                              {chat.loggi_status && (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                                  Loggi: {chat.loggi_status}
                                </span>
                              )}
                            </div>

                            {!!chat.unread && (
                              <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-1 text-[11px] font-semibold text-white">
                                {chat.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {hasMoreChats && (
                  <div className="p-4">
                    <button
                      type="button"
                      onClick={() =>
                        loadConversations({ page: currentPage + 1, append: true })
                      }
                      disabled={loadingChats}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingChats ? "Carregando..." : "Carregar mais"}
                    </button>
                  </div>
                )}
              </div>
            </aside>

            <section
              className={[
                "min-h-0 flex-col bg-[#efeae2]",
                mobileView === "chat" ? "flex" : "hidden",
                "lg:flex",
              ].join(" ")}
            >
              {selectedChat ? (
                <>
                  <header className="shrink-0 border-b border-zinc-200 bg-white px-3 py-3 md:px-5">
                    {selectedChat && isOutside24hWindow(selectedChat) && (
                      <div className="flex items-center justify-between gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
                        <span>
                          ⚠️ Fora da janela de 24h. Use um template para iniciar
                          a conversa.
                        </span>

                        <button
                          onClick={() => setIsActionsOpen(true)}
                          className="rounded-full bg-yellow-200 px-3 py-1 font-semibold text-yellow-900 hover:bg-yellow-300"
                        >
                          Ver templates
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          onClick={() => setMobileView("list")}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-600 transition hover:bg-zinc-100 lg:hidden"
                        >
                          ←
                        </button>
                        <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 font-semibold text-emerald-700 lg:hidden">
                          {selectedChat.name.slice(0, 1)}
                        </button>

                        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 font-semibold text-emerald-700 lg:flex">
                          {selectedChat.name.slice(0, 1)}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-semibold text-zinc-900">
                            {selectedChat.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span className="truncate">
                              {selectedChat.phone}
                            </span>
                            {selectedStatusMeta && (
                              <span
                                className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${selectedStatusMeta.className}`}
                              >
                                {selectedStatusMeta.label}
                              </span>
                            )}
                            {selectedChat?.loggi_status && (
                              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                Loggi: {selectedChat.loggi_status}
                              </span>
                            )}
                            {selectedChat?.loggi_motivo && (
                              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
                                {selectedChat.loggi_motivo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 md:gap-2">
                        <button
                          onClick={() => setSheetOpen(true)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-600 transition hover:bg-zinc-100"
                          title="Dados do cliente"
                        >
                          <User className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => setIsActionsOpen(true)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-600 transition hover:bg-zinc-100"
                          title="Ações"
                        >
                          <Settings2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </header>

                  <div
                    ref={messagesContainerRef}
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23d6d1c7%22 fill-opacity=%220.16%22%3E%3Cpath d=%22M36 34h-4v-4h4v4zm0-30h-4v4h4V4zM6 34H2v-4h4v4zm0-30H2v4h4V4zm30 60h-4v-4h4v4zM6 64H2v-4h4v4zm24-6h-4v-4h4v4zM0 28h4v4H0v-4zm60 0h-4v4h4v-4zM30 0h-4v4h4V0zM0 58h4v4H0v-4zm60 0h-4v4h4v-4z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] px-3 py-4 md:px-6"
                  >
                    {selectedChat.messages.map((item, index) => {
                      const previousMessage = selectedChat.messages[index - 1];

                      const currentDateKey = getDateKey(item.createdAt);
                      const previousDateKey = getDateKey(
                        previousMessage?.createdAt,
                      );

                      const showDateSeparator =
                        currentDateKey && currentDateKey !== previousDateKey;

                      return (
                        <div key={item.id}>
                          {showDateSeparator && (
                            <div className="my-4 flex justify-center">
                              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-500 shadow-sm">
                                {getDateLabel(item.createdAt)}
                              </span>
                            </div>
                          )}

                          <div
                            className={
                              item.fromMe
                                ? "flex justify-end"
                                : "flex justify-start"
                            }
                          >
                            <div
                              className={[
                                "group relative max-w-[88%] rounded-[20px] px-4 py-3 text-sm shadow-sm md:max-w-[72%]",
                                item.fromMe
                                  ? "rounded-br-md bg-emerald-100 text-zinc-800"
                                  : "rounded-bl-md bg-white text-zinc-800",
                              ].join(" ")}
                            >
                              {item.type === "reaction" ? (
                                <ReactionMessageBox item={item} />
                              ) : item.type === "audio" && item.audioUrl ? (
                                <WhatsAppAudioPlayer
                                  src={item.audioUrl}
                                  fromMe={item.fromMe}
                                />
                              ) : item.type === "sticker" && item.mediaUrl ? (
                                <div className="space-y-2">
                                  <img
                                    src={item.mediaUrl}
                                    alt="Figurinha recebida"
                                    className="max-h-[180px] max-w-[180px] rounded-2xl object-contain"
                                  />
                                  <div className="text-xs text-zinc-500">
                                    Figurinha
                                  </div>
                                </div>
                              ) : item.type === "location" ? (
                                <div className="space-y-2">
                                  <div className="rounded-2xl border border-zinc-200 bg-white/70 p-3">
                                    <div className="text-sm font-semibold text-zinc-700">
                                      📍 Localização recebida
                                    </div>

                                    <div className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-600">
                                      {getMessageFallbackText(item)}
                                    </div>

                                    {item.fileName &&
                                      item.fileName.includes(",") && (
                                        <a
                                          href={`https://www.google.com/maps?q=${encodeURIComponent(
                                            item.fileName,
                                          )}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                        >
                                          Abrir no mapa
                                        </a>
                                      )}
                                  </div>
                                </div>
                              ) : item.type === "image" && item.mediaUrl ? (
                                <div className="space-y-2">
                                  <img
                                    src={item.mediaUrl}
                                    alt="Imagem recebida"
                                    className="max-h-[260px] max-w-[260px] rounded-2xl object-cover"
                                  />
                                  {item.text && (
                                    <div className="whitespace-pre-wrap break-words">
                                      {getMessageFallbackText(item)}
                                    </div>
                                  )}
                                </div>
                              ) : item.type === "document" && item.mediaUrl ? (
                                <a
                                  href={item.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-2xl border border-zinc-200 bg-white/70 p-3 text-sm font-semibold text-zinc-700 underline"
                                >
                                  📄{" "}
                                  {item.fileName ||
                                    item.text ||
                                    "Documento recebido"}
                                </a>
                              ) : item.type === "video" && item.mediaUrl ? (
                                <video
                                  src={item.mediaUrl}
                                  controls
                                  className="max-h-[260px] max-w-[280px] rounded-2xl"
                                />
                              ) : (
                                <div className="whitespace-pre-wrap break-words">
                                  {getMessageFallbackText(item)}
                                </div>
                              )}

                              <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-zinc-500">
                                <span>{item.time}</span>
                                {item.fromMe && item.status === "failed" ? (
                                  <div className="flex items-center gap-2">
                                    <MessageStatus status={item.status} />

                                    <button
                                      onClick={() => retryFailedMessage(item)}
                                      className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                                    >
                                      reenviar
                                    </button>
                                  </div>
                                ) : (
                                  item.fromMe && (
                                    <MessageStatus status={item.status} />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </div>

                  <footer className="shrink-0 border-t border-zinc-200 bg-white px-2 py-2 md:px-4 md:py-4">
                    {isRecording ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCancelRecording}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <div className="flex h-[52px] flex-1 items-center justify-between rounded-[24px] border border-emerald-200 bg-emerald-50 px-4">
                          <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                            </span>

                            <span className="text-sm font-medium text-zinc-700">
                              Gravando...
                            </span>
                          </div>

                          <div className="text-sm font-semibold text-zinc-700">
                            {formatRecordingTime(recordingSeconds)}
                          </div>
                        </div>

                        <button
                          onClick={handleStopRecording}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      </div>
                    ) : audioPreviewUrl ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCancelRecording}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>

                        <div className="flex min-h-[52px] flex-1 items-center rounded-[24px] border border-zinc-200 bg-zinc-50 px-4">
                          <audio
                            src={audioPreviewUrl}
                            controls
                            className="w-full"
                          />
                        </div>

                        <button
                          onClick={handleSendAudio}
                          title="Enviar áudio"
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <SendHorizonal className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-end gap-2">
                        <button
                          onClick={() => setIsActionsOpen(true)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100"
                          title="Mensagens e status"
                        >
                          <Settings2 className="h-5 w-5" />
                        </button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (file.type.startsWith("image/")) {
                              const preview = URL.createObjectURL(file);
                              setPendingImageFile(file);
                              setPendingImagePreview(preview);
                              setImageCaption("");
                            } else {
                              handleSendDocument(file);
                            }

                            e.target.value = "";
                          }}
                        />

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 sm:inline-flex"
                        >
                          <Paperclip className="h-5 w-5" />
                        </button>

                        <div className="flex min-h-[48px] flex-1 items-center rounded-[24px] border border-zinc-200 bg-white px-4 py-2 shadow-sm">
                          <textarea
                            ref={textareaRef}
                            rows={1}
                            value={message}
                            onChange={(e) =>
                              handleMessageChange(e.target.value)
                            }
                            onKeyDown={handleTextareaKeyDown}
                            placeholder="Digite uma mensagem"
                            className="max-h-[110px] min-h-[24px] w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-6 outline-none placeholder:text-zinc-400"
                          />
                        </div>

                        <button
                          onClick={handleStartRecording}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100"
                          title="Gravar áudio"
                        >
                          <Mic className="h-5 w-5" />
                        </button>

                        <button
                          onClick={handleSendTypedMessage}
                          disabled={!message.trim()}
                          className={[
                            "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm transition",
                            message.trim()
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "cursor-not-allowed bg-zinc-200 text-zinc-400",
                          ].join(" ")}
                          title="Enviar mensagem"
                        >
                          <CornerDownLeft className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </footer>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center bg-[#f8fafc] p-8">
                  <div className="max-w-md text-center">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-50 text-emerald-600 shadow-sm">
                      <MessageCircle className="h-10 w-10" />
                    </div>

                    <h2 className="text-2xl font-bold text-zinc-900">
                      Central de conversas
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-zinc-500">
                      Selecione uma conversa na lista ao lado para visualizar o
                      histórico, responder clientes, enviar templates ou
                      atualizar o andamento do pedido.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {selectedChat && isActionsOpen && (
          <div className="fixed inset-0 z-[10000] bg-black/40">
            <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl md:bottom-auto md:left-auto md:right-6 md:top-6 md:w-[420px] md:rounded-[28px]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">
                    Ações rápidas
                  </div>
                  <div className="text-sm text-zinc-500">
                    Enviar mensagem ou atualizar andamento.
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsActionsOpen(false);
                    setShowManualRastreioInput(false);
                    setManualCodigoRastreio("");
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-600 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Conversa
                  </div>

                  <button
                    onClick={() => {
                      if (!selectedChat) return;

                      markConversationAsUnread(selectedChat.id);
                      setIsActionsOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 p-3 text-left hover:bg-zinc-50"
                  >
                    <MessageCircle className="h-5 w-5 text-zinc-600" />

                    <div>
                      <div className="text-sm font-semibold">
                        Marcar como não lida
                      </div>
                      <div className="text-xs text-zinc-500">
                        Deixar essa conversa destacada para atender depois.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      if (!selectedChat) return;

                      deleteConversationFromView(selectedChat.id);
                    }}
                    className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-5 w-5 text-rose-600" />

                    <div>
                      <div className="text-sm font-semibold">
                        Apagar conversa
                      </div>
                    </div>
                  </button>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Templates e mensagens rápidas
                  </div>

                  <div className="space-y-3">
                    <ActionCategory
                      title="Primeiro atendimento"
                      subtitle="Confirmação de endereço e início de conversa"
                      open={openActionCategories.primeiro_atendimento}
                      onToggle={() =>
                        toggleActionCategory("primeiro_atendimento")
                      }
                    >
                      <QuickActionButton
                        title="Confirmando endereço 1"
                        description="Template aprovado: confirmar_pedido"
                        preview={previewConfirmandoEndereco1}
                        loading={sendingConfirmarPedido}
                        disabled={isSendingAnyAction}
                        icon={<MapPinned className="h-5 w-5 text-zinc-600" />}
                        onClick={sendConfirmarPedidoTemplate}
                      />

                      <QuickActionButton
                        title="Confirmando endereço 2"
                        description="Template aprovado: um_message"
                        preview={previewConfirmandoEndereco2}
                        disabled={isSendingAnyAction}
                        icon={<MapPinned className="h-5 w-5 text-zinc-600" />}
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "um_message",
                            variables: [
                              nomeCliente,
                              nomeAtendente,
                              produtoPedido,
                              enderecoSelecionado.rua,
                              enderecoSelecionado.cidade,
                              enderecoSelecionado.numero,
                            ],
                            textPreview: previewConfirmandoEndereco2,
                          })
                        }
                      />

                      <QuickActionButton
                        title="Confirma o endereço?"
                        description="Template aprovado: confirm_endereco"
                        preview={previewConfirmEndereco}
                        disabled={isSendingAnyAction}
                        icon={
                          <MessageSquare className="h-5 w-5 text-zinc-600" />
                        }
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "confirm_endereco",
                            variables: [],
                            textPreview: previewConfirmEndereco,
                          })
                        }
                      />
                    </ActionCategory>

                    <ActionCategory
                      title="Cobrança"
                      subtitle="Mensagens e templates para pagamento pendente"
                      open={openActionCategories.cobranca}
                      onToggle={() => toggleActionCategory("cobranca")}
                    >
                      <QuickActionButton
                        title="Cobrança 1"
                        description="Template aprovado: cobranca_1_1"
                        preview={previewCobranca1}
                        disabled={isSendingAnyAction}
                        icon={
                          <BadgeDollarSign className="h-5 w-5 text-zinc-600" />
                        }
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "cobranca_1_1",
                            variables: [nomeCliente],
                            textPreview: previewCobranca1,
                          })
                        }
                      />

                      <QuickActionButton
                        title="Cobrança 2 / sim ou não"
                        description="Template aprovado: cobranca_2"
                        preview={previewCobranca2}
                        disabled={isSendingAnyAction}
                        icon={
                          <BadgeDollarSign className="h-5 w-5 text-zinc-600" />
                        }
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "cobranca_2",
                            variables: [],
                            textPreview: previewCobranca2,
                          })
                        }
                      />

                      <QuickActionButton
                        title="Cobrança 3"
                        description="Template aprovado: cobranca_3"
                        preview={previewCobranca3}
                        disabled={isSendingAnyAction}
                        icon={
                          <AlertTriangle className="h-5 w-5 text-zinc-600" />
                        }
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "cobranca_3",
                            variables: [],
                            textPreview: previewCobranca3,
                          })
                        }
                      />

                      <QuickActionButton
                        title="1° Msg Pagamento amanhã"
                        description="Template aprovado: cobranca_pendente"
                        preview={previewCobrancaPendente}
                        disabled={isSendingAnyAction}
                        icon={<Wallet className="h-5 w-5 text-zinc-600" />}
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "cobranca_pendente",
                            variables: [nomeCliente],
                            textPreview: previewCobrancaPendente,
                          })
                        }
                      />

                      <QuickActionButton
                        title="Deixei aviso financeiro"
                        description="Template aprovado: cob_pendente_2"
                        preview={previewCobPendente2}
                        disabled={isSendingAnyAction}
                        icon={<Wallet className="h-5 w-5 text-zinc-600" />}
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "cob_pendente_2",
                            variables: [],
                            textPreview: previewCobPendente2,
                          })
                        }
                      />

                      <QuickActionButton
                        title="Confirmado amanhã?"
                        description="Template aprovado: cob_pendente_3"
                        preview={previewCobPendente3}
                        disabled={isSendingAnyAction}
                        icon={<Wallet className="h-5 w-5 text-zinc-600" />}
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "cob_pendente_3",
                            variables: [nomeCliente],
                            textPreview: previewCobPendente3,
                          })
                        }
                      />
                    </ActionCategory>

                    <ActionCategory
                      title="Outros"
                      subtitle="Rastreio, cliente sem endereço, áudio e foto pronta"
                      open={openActionCategories.outros}
                      onToggle={() => toggleActionCategory("outros")}
                    >
                      <QuickActionButton
                        title="Código de Rastreio"
                        description="Template aprovado: cod_rastreio"
                        preview="Template de rastreio com nome do cliente e código Loggi."
                        loading={sendingCodigoRastreio}
                        disabled={isSendingAnyAction}
                        icon={<Truck className="h-5 w-5 text-zinc-600" />}
                        onClick={() => sendCodigoRastreioTemplate()}
                      />

                      {showManualRastreioInput && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                          <div className="mb-2 text-sm font-semibold text-amber-900">
                            Código de rastreio não encontrado
                          </div>

                          <div className="mb-3 text-xs leading-relaxed text-amber-800">
                            Digite o código manualmente para enviar o template
                            para este cliente.
                          </div>

                          <input
                            value={manualCodigoRastreio}
                            onChange={(e) =>
                              setManualCodigoRastreio(
                                e.target.value.toUpperCase(),
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleEnviarCodigoRastreioManual();
                              }
                            }}
                            placeholder="Ex: TUHGQTKI"
                            className="mb-3 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-amber-300"
                          />

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowManualRastreioInput(false);
                                setManualCodigoRastreio("");
                              }}
                              disabled={sendingCodigoRastreio}
                              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              onClick={handleEnviarCodigoRastreioManual}
                              disabled={sendingCodigoRastreio}
                              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {sendingCodigoRastreio && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              Enviar rastreio
                            </button>
                          </div>
                        </div>
                      )}

                      <QuickActionButton
                        title="Chamar Cliente"
                        description="Template aprovado: chamar_cliente"
                        preview={previewChamarCliente}
                        disabled={isSendingAnyAction}
                        icon={
                          <MessageCircle className="h-5 w-5 text-zinc-600" />
                        }
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "chamar_cliente",
                            variables: [nomeCliente],
                            textPreview: previewChamarCliente,
                          })
                        }
                      />

                      <QuickActionButton
                        title="Chamar Cliente com Urgência"
                        description="Template aprovado: falar_urg"
                        preview={previewFalarUrg}
                        disabled={isSendingAnyAction}
                        icon={
                          <AlertTriangle className="h-5 w-5 text-zinc-600" />
                        }
                        onClick={() =>
                          sendApprovedTemplate({
                            templateName: "falar_urg",
                            variables: [nomeCliente],
                            textPreview: previewFalarUrg,
                          })
                        }
                      />

                      <QuickActionButton
                        title="1° Áudio"
                        description="Enviar áudio pronto de cobrança"
                        preview="Envia o áudio pronto salvo em /audios/fechar_pedido.ogg"
                        disabled={isSendingAnyAction}
                        icon={<Mic className="h-5 w-5 text-zinc-600" />}
                        onClick={() =>
                          sendPresetAudio("/audios/fechar_pedido.ogg")
                        }
                      />

                      <QuickActionButton
                        title="Foto embalando pedido"
                        description="Foto pronta com legenda"
                        preview="Acabei de pedir para as meninas aqui no escritório embalar seu pedido ✅🙏"
                        disabled={isSendingAnyAction}
                        icon={
                          <PackageCheck className="h-5 w-5 text-zinc-600" />
                        }
                        onClick={sendPresetImageWithCaption}
                      />

                      <QuickActionButton
                        title="Resumo pedido"
                        description="Produto, valor e pagamento"
                        preview={`RESUMO DO PEDIDO ✅\n\nProduto: ${produtoPedido}\nValor: ${selectedChat.amount || "A confirmar"}\nForma de pagamento: ${selectedChat.paymentMethod || "A confirmar"}`}
                        disabled={isSendingAnyAction}
                        icon={<FileText className="h-5 w-5 text-zinc-600" />}
                        onClick={() =>
                          appendTextMessageToSelected(
                            `RESUMO DO PEDIDO ✅\n\nProduto: ${produtoPedido}\nValor: R$ ${
                              selectedChat.amount || "A confirmar"
                            },00\nForma de pagamento: pagamento na entrega direto aqui pra mim`,
                          )
                        }
                      />
                    </ActionCategory>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Atualizar andamento
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["enviado", Truck],
                        ["a_pagar", Wallet],
                        ["pago", BadgeDollarSign],
                        ["calote", AlertTriangle],
                        ["extravio", PackageCheck],
                      ] as const
                    ).map(([status, Icon]) => (
                      <button
                        key={status}
                        onClick={() => updateSelectedPipelineStatus(status)}
                        className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium ${STATUS_META[status].className}`}
                      >
                        <Icon className="h-4 w-4" />
                        {STATUS_META[status].label}
                      </button>
                    ))}
                  </div>
                  {selectedChat?.pipelineStatus && (
                    <button
                      onClick={() => updateSelectedPipelineStatus("")}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                    >
                      <X className="h-4 w-4" />
                      Limpar status
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {pendingImageFile && pendingImagePreview && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">
                    Enviar imagem
                  </div>
                  <div className="text-sm text-zinc-500">
                    Adicione uma mensagem antes de enviar.
                  </div>
                </div>

                <button
                  onClick={() => {
                    URL.revokeObjectURL(pendingImagePreview);
                    setPendingImageFile(null);
                    setPendingImagePreview(null);
                    setImageCaption("");
                  }}
                  className="rounded-full p-2 hover:bg-zinc-100"
                >
                  ✕
                </button>
              </div>

              <img
                src={pendingImagePreview}
                alt="Prévia da imagem"
                className="max-h-[420px] w-full rounded-2xl object-contain bg-zinc-100"
              />

              <div className="mt-4 flex items-end gap-2">
                <textarea
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  rows={2}
                  placeholder="Digite uma mensagem para acompanhar a imagem..."
                  className="max-h-[120px] min-h-[52px] flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />

                <button
                  onClick={async () => {
                    const file = pendingImageFile;
                    const preview = pendingImagePreview;
                    const caption = imageCaption.trim();

                    setPendingImageFile(null);
                    setPendingImagePreview(null);
                    setImageCaption("");

                    URL.revokeObjectURL(preview);

                    await handleSendImage(file, caption);
                  }}
                  className="h-12 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}
        <PaymentDialog
          open={payOpen}
          onOpenChange={(open) => {
            setPayOpen(open);

            if (!open) {
              setPayCtx(null);
            }
          }}
          cliente={payCtx}
          onConfirm={confirmarPagamentoWhatsapp}
        />
        <ClientSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          pedido={
            selectedChat
              ? {
                  id: selectedChat.clientId,
                  nome: selectedChat.name,
                  phone: selectedChat.phone,
                  produto: selectedChat.product || selectedChat.tag || "",
                  valor_total: Number(
                    String(selectedChat.amount || "0")
                      .replace("R$", "")
                      .replace(".", "")
                      .replace(",", ".")
                      .trim(),
                  ),
                  status_pagamento:
                    selectedChat.pipelineStatus === "pago"
                      ? "Pago"
                      : selectedChat.pipelineStatus === "calote"
                        ? "Não Pago"
                        : "Pendente",
                  status_envio:
                    selectedChat.pipelineStatus === "enviado"
                      ? "Enviado"
                      : selectedChat.pipelineStatus === "a_pagar" ||
                          selectedChat.pipelineStatus === "pago"
                        ? "Entregue"
                        : selectedChat.pipelineStatus === "extravio"
                          ? "Extravio"
                          : "",
                  endereco: {
                    logradouro: selectedChat.address || "",
                  },
                  observacao: selectedChat.notes || "",
                }
              : null
          }
          onUpdated={(updated) => {
            setChats((prev) =>
              prev.map((chat) =>
                chat.clientId === updated.id
                  ? {
                      ...chat,
                      name: updated.nome || chat.name,
                      phone: updated.phone || chat.phone,
                      product: updated.produto || chat.product,
                      amount: updated.valor_total
                        ? `R$ ${Number(updated.valor_total).toFixed(2).replace(".", ",")}`
                        : chat.amount,
                      notes: updated.observacao || chat.notes,
                    }
                  : chat,
              ),
            );
          }}
        />
      </div>
    </>
  );
}
