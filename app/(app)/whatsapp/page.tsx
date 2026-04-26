"use client";

import { ClientSheet } from "@/components/atendimento/client-sheet";
import { apiJson } from "@/lib/api";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Check,
  CheckCheck,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  Filter,
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

type ChatStatus = "sent" | "delivered" | "read" | "pending" | "failed";

type ClientPipelineStatus =
  | "aguardando_envio"
  | "aguardando_chegar"
  | "a_pagar"
  | "pago"
  | "calote";

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
  type?: "text" | "audio" | "image" | "document" | "video";
  mimeType?: string;
  fileName?: string;
};

type ChatItem = {
  id: string;
  clientId: string;
  name: string;
  phone: string;
  tag?: string;
  pipelineStatus: ClientPipelineStatus;
  lastMessage: string;
  lastTime: string;
  unread?: number;
  online?: boolean;
  address?: string;
  product?: string;
  amount?: string;
  paymentMethod?: string;
  notes?: string;
  messages: ChatMessage[];
};

const STATUS_META: Record<
  ClientPipelineStatus,
  { label: string; className: string }
> = {
  aguardando_envio: {
    label: "Ag. envio",
    className: "bg-sky-100 text-sky-700 border-sky-200",
  },
  aguardando_chegar: {
    label: "Ag. chegar",
    className: "bg-violet-100 text-violet-700 border-violet-200",
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
    pipelineStatus: "aguardando_envio",
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

function StatusIcon({ status }: { status?: ChatStatus }) {
  if (status === "read") return <CheckCheck className="h-4 w-4 text-sky-500" />;
  if (status === "delivered")
    return <CheckCheck className="h-4 w-4 text-zinc-500" />;
  if (status === "sent") return <Check className="h-4 w-4 text-zinc-500" />;
  return <Clock3 className="h-4 w-4 text-zinc-400" />;
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

export default function WhatsAppPage() {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | ClientPipelineStatus
  >("todos");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastUnreadTotalRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  async function loadConversations() {
    try {
      setLoadingChats(true);

      const response = await apiJson<{
        success: boolean;
        data: any[];
      }>("/whatsapp/conversations");

      const mappedChats: ChatItem[] = response.data
        .sort((a, b) => {
          const dateA = new Date(
            a.updatedAt || a.lastTime || a.createdAt || 0,
          ).getTime();
          const dateB = new Date(
            b.updatedAt || b.lastTime || b.createdAt || 0,
          ).getTime();

          return dateB - dateA;
        })
        .map((item) => ({
          id: item.id,
          clientId: item.clientId || "",
          name: item.name || item.phone,
          phone: item.phone,
          tag: item.product || "",
          pipelineStatus: item.pipelineStatus || "aguardando_envio",
          lastMessage: item.lastMessage || "",
          lastTime: item.lastTime
            ? new Date(item.lastTime).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          unread: item.unread || 0,
          online: false,
          address: item.address || "",
          product: item.product || "",
          amount: item.amount || "",
          paymentMethod: item.paymentMethod || "",
          notes: item.notes || "",
          messages: [],
        }));

      setChats((prev) =>
        mappedChats.map((newChat) => {
          const oldChat = prev.find((chat) => chat.id === newChat.id);

          return {
            ...newChat,
            messages: oldChat?.messages || [],
          };
        }),
      );

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
        shouldScrollToBottomRef.current = true;
        loadMessages(chatFromUrl.id);
        markConversationAsRead(chatFromUrl.id);
        return;
      }

      if (mappedChats.length > 0) {
        setSelectedId((current) => current || mappedChats[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      setLoadingChats(false);
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

  async function loadMessages(conversationId: string) {
    try {
      const response = await apiJson<{
        success: boolean;
        data: any[];
      }>(`/whatsapp/conversations/${conversationId}/messages`);

      const mappedMessages: ChatMessage[] = response.data.map((msg) => ({
        id: msg.id,
        fromMe: msg.direction === "out",
        text: msg.text || "",
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
        status: msg.status || "sent",
        type: msg.type || "text",
      }));

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== conversationId) return chat;

          const temporaryMessages = chat.messages.filter((msg) =>
            msg.id.startsWith("temp_"),
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
            messages: [...mappedMessages, ...temporaryMessagesNotYetSynced],
          };
        }),
      );
      if (shouldScrollToBottomRef.current) {
        scrollChatToBottom("auto");
        shouldScrollToBottomRef.current = false;
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

  const filteredChats = useMemo(() => {
    const term = search.trim().toLowerCase();

    return chats.filter((chat) => {
      const matchesSearch =
        !term ||
        chat.name.toLowerCase().includes(term) ||
        chat.phone.toLowerCase().includes(term) ||
        (chat.tag || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "todos" || chat.pipelineStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, chats]);

  const selectedChat =
    chats.find((chat) => chat.id === selectedId) ?? filteredChats[0] ?? null;

  useEffect(() => {
    if (!selectedId) return;

    shouldScrollToBottomRef.current = true;
  }, [selectedId]);

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
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
      markConversationAsRead(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    const interval = window.setInterval(() => {
      loadMessages(selectedId);
      loadConversations();
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

    const time = getCurrentTime();

    const tempMessageId = `temp_${Date.now()}`;

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== selectedChat.id) return chat;

        const newMessage: ChatMessage = {
          id: tempMessageId,
          fromMe: true,
          text,
          time,
          createdAt: getNowISO(),
          status: "pending",
          type: "text",
        };

        return {
          ...chat,
          lastMessage: text,
          lastTime: time,
          messages: [...chat.messages, newMessage],
        };
      }),
    );

    setMessage("");
    setIsActionsOpen(false);

    try {
      const response = await apiJson<{
        success: boolean;
        conversationId: string;
        data: any;
      }>("/whatsapp/send-text", {
        method: "POST",
        body: JSON.stringify({
          to: selectedChat.phone,
          message: text,
          clientId: selectedChat.clientId,
          conversationId: selectedChat.id,
        }),
      });

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== selectedChat.id) return chat;

          return {
            ...chat,
            messages: chat.messages.map((msg) =>
              msg.id === tempMessageId
                ? {
                    ...msg,
                    status: "sent",
                  }
                : msg,
            ),
          };
        }),
      );

      await loadMessages(response.conversationId || selectedChat.id);
      await loadConversations();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao enviar mensagem";

      alert(errorMessage);

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== selectedChat.id) return chat;

          return {
            ...chat,
            messages: chat.messages.map((msg) =>
              msg.id === tempMessageId
                ? {
                    ...msg,
                    status: "pending",
                    text: `${msg.text}\n\n⚠️ Erro ao enviar`,
                  }
                : msg,
            ),
          };
        }),
      );
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
      await apiJson(`/whatsapp/conversations/${selectedChat.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          pipelineStatus: newStatus,
        }),
      });

      await loadConversations();
    } catch (error) {
      console.error("Erro ao atualizar andamento:", error);
      alert("Erro ao atualizar andamento");
    }
  }

  function handleSendTypedMessage() {
    const text = message.trim();
    if (!text) return;
    appendTextMessageToSelected(text);
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendTypedMessage();
    }
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

    appendAudioMessageToSelected(audioBlob, audioPreviewUrl);

    const formData = new FormData();
    formData.append("audio", audioBlob, `audio-${Date.now()}.webm`);
    formData.append("to", selectedChat.phone);
    formData.append("clientId", selectedChat.clientId || "");
    formData.append("conversationId", selectedChat.id);

    try {
      await fetch("https://api.emipar.life/whatsapp/send-audio", {
        method: "POST",
        body: formData,
      });

      await loadConversations();

      window.setTimeout(() => {
        loadMessages(selectedChat.id);
      }, 1500);
    } catch (error) {
      console.error("Erro ao enviar áudio para API:", error);
      alert("Erro ao enviar áudio");
    }

    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingSeconds(0);
  }

  async function handleSendImage(file: File) {
    if (!selectedChat) return;

    const previewUrl = URL.createObjectURL(file);
    const time = getCurrentTime();
    const tempMessageId = `temp_image_${Date.now()}`;

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== selectedChat.id) return chat;

        const newMessage: ChatMessage = {
          id: tempMessageId,
          fromMe: true,
          text: "",
          mediaUrl: previewUrl,
          time,
          status: "pending",
          type: "image",
          mimeType: file.type,
          fileName: file.name,
        };

        return {
          ...chat,
          lastMessage: "🖼️ Imagem",
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
    formData.append("caption", "");

    try {
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
        loadMessages(selectedChat.id);
      }, 1500);
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      alert("Erro ao enviar imagem");
    }
  }

  async function handleSendDocument(file: File) {
    if (!selectedChat) return;

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
        loadMessages(selectedChat.id);
      }, 1500);
    } catch (error) {
      console.error("Erro ao enviar documento:", error);
      alert("Erro ao enviar documento");
    }
  }

  async function sendPresetAudio(audioPath: string) {
    if (!selectedChat) return;

    try {
      const audioResponse = await fetch(audioPath);
      const blob = await audioResponse.blob();

      const file = new File([blob], "audio-pronto.ogg", {
        type: "audio/ogg",
      });

      const previewUrl = URL.createObjectURL(file);
      appendAudioMessageToSelected(file, previewUrl);

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("to", selectedChat.phone);
      formData.append("clientId", selectedChat.clientId || "");
      formData.append("conversationId", selectedChat.id);

      await fetch("https://api.emipar.life/whatsapp/send-audio", {
        method: "POST",
        body: formData,
      });

      setIsActionsOpen(false);

      await loadMessages(selectedChat.id);
      await loadConversations();
    } catch (error) {
      console.error("Erro ao enviar áudio pronto:", error);
      alert("Erro ao enviar áudio pronto");
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

  async function sendConfirmarPedidoTemplate() {
    if (!selectedChat) return;

    const endereco = parseEndereco(selectedChat.address);

    try {
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

      await loadMessages(selectedChat.id);
      await loadConversations();
    } catch (error) {
      console.error("Erro ao enviar template confirmar_pedido:", error);
      alert("Erro ao enviar template de confirmação de pedido");
    }
  }

  const selectedStatusMeta = selectedChat
    ? STATUS_META[selectedChat.pipelineStatus]
    : null;

  return (
    <div
      className={[
        isFullscreen
          ? "fixed inset-0 z-[9999] overflow-hidden bg-white p-2 md:p-4"
          : "h-[calc(100vh-105px)] overflow-hidden",
      ].join(" ")}
    >
      {!isFullscreen && (
        <div className="mb-4 hidden items-center justify-between md:flex">
          <div>
            <h1 className="text-2xl font-semibold">WhatsApp</h1>
            <p className="text-sm text-zinc-500">
              Central de conversas e atendimento.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(
              [
                "todos",
                "aguardando_envio",
                "aguardando_chegar",
                "a_pagar",
                "pago",
                "calote",
              ] as const
            ).map((status) => {
              const active = statusFilter === status;
              const label =
                status === "todos" ? "Todos" : STATUS_META[status].label;

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={[
                    "rounded-2xl border px-3 py-2 text-xs font-medium transition",
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

                <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50">
                  <MoreVertical className="h-5 w-5" />
                </button>
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredChats.map((chat) => {
                const active = selectedChat?.id === chat.id;
                const pipelineMeta = STATUS_META[chat.pipelineStatus];
                const hasUnread = (chat.unread || 0) > 0;

                return (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setSelectedId(chat.id);
                      setMobileView("chat");
                      loadMessages(chat.id);
                      markConversationAsRead(chat.id);
                    }}
                    className={[
                      "w-full border-b px-4 py-4 text-left transition",
                      active
                        ? "border-emerald-100 bg-emerald-50/80"
                        : hasUnread
                          ? "border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/70"
                          : "border-zinc-100 bg-white hover:bg-zinc-50",
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
                            {chat.lastTime}
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
                            <span
                              className={`inline-flex w-fit rounded-full border px-2 py-1 text-[10px] font-semibold ${pipelineMeta.className}`}
                            >
                              {pipelineMeta.label}
                            </span>
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
                        ⚠️ Fora da janela de 24h. Use um template para iniciar a
                        conversa.
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
                          <span className="truncate">{selectedChat.phone}</span>
                          {selectedStatusMeta && (
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${selectedStatusMeta.className}`}
                            >
                              {selectedStatusMeta.label}
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
                              "max-w-[88%] rounded-[20px] px-4 py-3 text-sm shadow-sm md:max-w-[72%]",
                              item.fromMe
                                ? "rounded-br-md bg-emerald-100 text-zinc-800"
                                : "rounded-bl-md bg-white text-zinc-800",
                            ].join(" ")}
                          >
                            {item.type === "audio" && item.audioUrl ? (
                              <div className="min-w-[220px]">
                                <div className="mb-2 text-xs font-semibold text-zinc-500">
                                  🎤 Áudio
                                </div>
                                <audio
                                  src={item.audioUrl}
                                  controls
                                  className="w-full max-w-[280px]"
                                />
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
                                    {item.text}
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
                                {item.text}
                              </div>
                            )}

                            <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-zinc-500">
                              <span>{item.time}</span>
                              {item.fromMe && item.status === "failed" ? (
  <button
    onClick={() => retryFailedMessage(item)}
    className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
  >
    reenviar
  </button>
) : (
  item.fromMe && <StatusIcon status={item.status} />
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
                            handleSendImage(file);
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
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={handleTextareaKeyDown}
                          placeholder="Digite uma mensagem"
                          className="max-h-[110px] min-h-[24px] w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-6 outline-none placeholder:text-zinc-400"
                        />
                      </div>

                      <button
                        onClick={handleStartRecording}
                        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 sm:inline-flex"
                      >
                        <Mic className="h-5 w-5" />
                      </button>

                      <button
                        onClick={
                          message.trim()
                            ? handleSendTypedMessage
                            : handleStartRecording
                        }
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        {message.trim() ? (
                          <SendHorizonal className="h-5 w-5" />
                        ) : (
                          <Mic className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  )}
                </footer>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-zinc-500">
                Selecione uma conversa.
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
                onClick={() => setIsActionsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-600 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Templates e mensagens rápidas
                </div>

                <div className="grid gap-2">
                  <button
                    onClick={() =>
                      appendTextMessageToSelected(
                        `Olá ${selectedChat.name}, seu pedido já chegou e o pagamento está pendente. Me confirma por aqui para seguirmos com a finalização, por favor.`,
                      )
                    }
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 text-left hover:bg-zinc-50"
                  >
                    <BadgeDollarSign className="h-5 w-5 text-zinc-600" />
                    <div>
                      <div className="text-sm font-semibold">Cobrança</div>
                      <div className="text-xs text-zinc-500">
                        Pedido chegou e falta pagar.
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => sendPresetAudio("/audios/fechar_pedido.ogg")}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 text-left hover:bg-zinc-50"
                  >
                    <Mic className="h-5 w-5 text-zinc-600" />
                    <div>
                      <div className="text-sm font-semibold">1° Áudio</div>
                      <div className="text-xs text-zinc-500">
                        Enviar áudio pronto de cobrança.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      appendTextMessageToSelected(
                        `Olá ${selectedChat.name}, consta aqui para nós que seu pedido foi entregue. Você confirma que recebeu certinho?`,
                      )
                    }
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 text-left hover:bg-zinc-50"
                  >
                    <PackageCheck className="h-5 w-5 text-zinc-600" />
                    <div>
                      <div className="text-sm font-semibold">
                        Confirmar entrega
                      </div>
                      <div className="text-xs text-zinc-500">
                        Perguntar se recebeu.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      appendTextMessageToSelected(
                        `RESUMO DO PEDIDO ✅\n\nProduto: ${
                          selectedChat.product || selectedChat.tag || "Pedido"
                        }\nValor: ${
                          selectedChat.amount || "A confirmar"
                        }\nForma de pagamento: ${
                          selectedChat.paymentMethod || "A confirmar"
                        }`,
                      )
                    }
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 text-left hover:bg-zinc-50"
                  >
                    <FileText className="h-5 w-5 text-zinc-600" />
                    <div>
                      <div className="text-sm font-semibold">Resumo pedido</div>
                      <div className="text-xs text-zinc-500">
                        Produto, valor e pagamento.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={sendConfirmarPedidoTemplate}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 text-left hover:bg-zinc-50"
                  >
                    <MapPinned className="h-5 w-5 text-zinc-600" />
                    <div>
                      <div className="text-sm font-semibold">
                        Confirmar endereço
                      </div>
                      <div className="text-xs text-zinc-500">
                        Enviar endereço do cliente.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Atualizar andamento
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["aguardando_envio", Truck],
                      ["aguardando_chegar", PackageCheck],
                      ["a_pagar", Wallet],
                      ["pago", BadgeDollarSign],
                      ["calote", AlertTriangle],
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
              </div>
            </div>
          </div>
        </div>
      )}

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
                  selectedChat.pipelineStatus === "pago" ? "Pago" : "Pendente",
                status_envio:
                  selectedChat.pipelineStatus === "aguardando_envio"
                    ? "Ag. Envio"
                    : selectedChat.pipelineStatus === "aguardando_chegar"
                      ? "Enviado"
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
  );
}
