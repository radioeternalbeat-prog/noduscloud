import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  FileText,
  Filter,
  FolderHeart,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  Inbox,
  LayoutGrid,
  Link2,
  List,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  Video,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type ContentType = "image" | "video" | "note" | "link" | "publication";
type Status = "idea" | "draft" | "ready" | "published";
type Section = "Inicio" | "Biblioteca" | "Publicaciones" | "Calendario" | "Colecciones" | "Favoritos" | "Enlaces compartidos" | "Papelera";

type ContentItem = {
  id: number | string;
  type: ContentType;
  title: string;
  description?: string | null;
  body?: string | null;
  url?: string | null;
  fileUrl?: string | null;
  image?: string;
  category?: string | null;
  tags?: string | null;
  status: Status;
  platform?: string | null;
  isFavorite: boolean;
  createdAt?: Date | string;
  scheduledAt?: Date | string | null;
};

const demoItems: ContentItem[] = [
  {
    id: "demo-1",
    type: "image",
    title: "Lanzamiento de temporada",
    description: "Foto principal para la campaña de septiembre.",
    image: "/manus-storage/producto_12eb2355.jpg",
    category: "Promociones",
    tags: "instagram, producto, campaña",
    status: "ready",
    platform: "Instagram",
    isFavorite: true,
  },
  {
    id: "demo-2",
    type: "note",
    title: "Ideas para historias",
    description: "Tres ángulos para mostrar el detrás de escena.",
    body: "Mostrar el proceso, contar el beneficio y cerrar con una pregunta.",
    category: "Ideas",
    tags: "historias, ideas",
    status: "idea",
    platform: "Instagram",
    isFavorite: false,
  },
  {
    id: "demo-3",
    type: "image",
    title: "Moodboard de marca",
    description: "Referencias de color y composición.",
    image: "/manus-storage/escritorio_060ef1fc.jpg",
    category: "Recursos de marca",
    tags: "referencia, visual",
    status: "draft",
    platform: "",
    isFavorite: true,
  },
  {
    id: "demo-4",
    type: "link",
    title: "Guía de contenidos que convierten",
    description: "Artículo guardado para revisar y resumir.",
    url: "https://example.com/guia-contenidos",
    category: "Inspiración",
    tags: "lectura, estrategia",
    status: "idea",
    platform: "",
    isFavorite: false,
  },
  {
    id: "demo-5",
    type: "image",
    title: "Mesa de trabajo",
    description: "Textura cálida para una publicación educativa.",
    image: "/manus-storage/ideas_d097ea82.jpg",
    category: "Contenido educativo",
    tags: "texturas, contenido",
    status: "published",
    platform: "Facebook",
    isFavorite: false,
  },
  {
    id: "demo-6",
    type: "publication",
    title: "Mensaje para clientes frecuentes",
    description: "Texto listo para enviar por WhatsApp.",
    body: "Gracias por acompañarnos. Tenemos una novedad pensada especialmente para ti.",
    category: "Clientes",
    tags: "whatsapp, clientes",
    status: "ready",
    platform: "WhatsApp",
    isFavorite: false,
  },
];

const sections: { label: Section; icon: typeof Inbox }[] = [
  { label: "Inicio", icon: Inbox },
  { label: "Biblioteca", icon: BookOpen },
  { label: "Publicaciones", icon: Send },
  { label: "Calendario", icon: CalendarDays },
  { label: "Colecciones", icon: FolderHeart },
  { label: "Favoritos", icon: Heart },
  { label: "Enlaces compartidos", icon: Link2 },
];

const statusCopy: Record<Status, { label: string; className: string }> = {
  idea: { label: "Idea", className: "bg-[#f0ecff] text-[#6e56cf]" },
  draft: { label: "Borrador", className: "bg-[#fff4dd] text-[#9b6a17]" },
  ready: { label: "Listo", className: "bg-[#e6f5ed] text-[#2b7a59]" },
  published: { label: "Publicado", className: "bg-[#edf0f2] text-[#627079]" },
};

function TypeIcon({ type, size = 15 }: { type: ContentType; size?: number }) {
  if (type === "image") return <ImageIcon size={size} />;
  if (type === "video") return <Video size={size} />;
  if (type === "link") return <Link2 size={size} />;
  if (type === "publication") return <Send size={size} />;
  return <FileText size={size} />;
}

function formatDate(date?: Date | string) {
  if (!date) return "Hace un momento";
  return new Date(date).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

async function prepareUploadFile(file: File) {
  if (!file.type.startsWith("image/")) {
    return { dataUrl: await readAsDataUrl(file), contentType: file.type, fileName: file.name, compressed: false };
  }
  const bitmap = await createImageBitmap(file);
  const maxSide = 2200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return { dataUrl: await readAsDataUrl(file), contentType: file.type, fileName: file.name, compressed: false };
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) return { dataUrl: await readAsDataUrl(file), contentType: file.type, fileName: file.name, compressed: false };
  return { dataUrl: await readAsDataUrl(blob), contentType: "image/jpeg", fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg", compressed: blob.size < file.size };
}

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("Inicio");
  const [items, setItems] = useState<ContentItem[]>(demoItems);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | ContentType>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState<ContentType>("note");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("Sin organizar");
  const [newPlatform, setNewPlatform] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [shareTarget, setShareTarget] = useState<{ kind: "content" | "collection"; title: string; contentId?: number; collectionName?: string } | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareId, setShareId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contentQuery = trpc.content.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const createContent = trpc.content.create.useMutation();
  const updateContent = trpc.content.update.useMutation();
  const uploadFile = trpc.content.upload.useMutation();
  const createShare = trpc.share.create.useMutation();
  const deactivateShare = trpc.share.deactivate.useMutation();
  const shareLinksQuery = trpc.share.mine.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  useEffect(() => {
    if (isAuthenticated && contentQuery.data) {
      setItems(contentQuery.data.length ? contentQuery.data.map(item => ({ ...item, tags: item.tags ?? "" })) : demoItems);
    }
  }, [contentQuery.data, isAuthenticated]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter(item => {
      const matchesQuery = !normalized || [item.title, item.description, item.body, item.category, item.tags, item.platform]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
      const matchesType = activeFilter === "all" || item.type === activeFilter;
      const matchesSection = activeSection === "Favoritos" ? item.isFavorite : activeSection === "Publicaciones" ? item.type === "publication" : true;
      return matchesQuery && matchesType && matchesSection;
    });
  }, [activeFilter, activeSection, items, query]);

  const stats = useMemo(() => ({
    total: items.length,
    ready: items.filter(item => item.status === "ready").length,
    ideas: items.filter(item => item.status === "idea").length,
    favorites: items.filter(item => item.isFavorite).length,
  }), [items]);

  const selectSection = (section: Section) => {
    setActiveSection(section);
    setMobileMenu(false);
    if (section !== "Biblioteca") setActiveFilter("all");
  };

  const openComposer = (type: ContentType = "note") => {
    setComposerType(type);
    setShowComposer(true);
  };

  const resetComposer = () => {
    setShowComposer(false);
    setNewTitle("");
    setNewBody("");
    setNewCategory("Sin organizar");
    setNewPlatform("");
    setNewScheduledAt("");
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (!isAuthenticated) {
      toast.info("Inicia sesión para guardar archivos reales en tu biblioteca.");
      startLogin();
      return;
    }
    for (const file of files) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`${file.name} no es una foto o video compatible.`);
        continue;
      }
      if (file.size > 45 * 1024 * 1024) {
        toast.error(`${file.name} supera el límite de 45 MB.`);
        continue;
      }
      const prepared = await prepareUploadFile(file);
      const base64 = prepared.dataUrl.split(",")[1] || "";
      try {
        const uploaded = await uploadFile.mutateAsync({ fileName: prepared.fileName, contentType: prepared.contentType, dataBase64: base64 });
        setItems(current => [{ ...uploaded, tags: uploaded.tags ?? "", image: uploaded.type === "image" ? uploaded.fileUrl ?? undefined : undefined }, ...current]);
        toast.success(prepared.compressed ? `${file.name} se optimizó y ya está en tu biblioteca.` : `${file.name} ya está en tu biblioteca.`);
      } catch {
        toast.error(`No se pudo cargar ${file.name}.`);
      }
    }
  };

  const addItem = () => {
    if (!newTitle.trim()) {
      toast.error("Escribe un título para guardar el contenido.");
      return;
    }
    const localItem: ContentItem = {
      id: `local-${Date.now()}`,
      type: composerType,
      title: newTitle.trim(),
      body: newBody.trim(),
      description: newBody.trim() || "Contenido nuevo en tu biblioteca.",
      category: newCategory,
      tags: newPlatform ? newPlatform.toLowerCase() : "",
      platform: newPlatform,
      status: newScheduledAt ? "ready" : "idea",
      scheduledAt: newScheduledAt || null,
      isFavorite: false,
    };

    if (isAuthenticated) {
      createContent.mutate({
        type: composerType,
        title: localItem.title,
        body: localItem.body ?? undefined,
        description: localItem.description ?? undefined,
        category: localItem.category ?? undefined,
        platform: localItem.platform ?? undefined,
        tags: localItem.tags ?? undefined,
        status: newScheduledAt ? "ready" : "idea",
        scheduledAt: newScheduledAt || undefined,
      }, {
        onSuccess: created => {
          setItems(current => [{ ...created, tags: created.tags ?? "" }, ...current]);
          toast.success("Guardado en tu biblioteca.");
          resetComposer();
        },
        onError: () => toast.error("No pudimos guardar el contenido. Inténtalo otra vez."),
      });
    } else {
      setItems(current => [localItem, ...current]);
      toast.success("Guardado en modo demo. Inicia sesión para conservarlo.");
      resetComposer();
    }
  };

  const toggleFavorite = (item: ContentItem) => {
    const nextFavorite = !item.isFavorite;
    setItems(current => current.map(entry => entry.id === item.id ? { ...entry, isFavorite: nextFavorite } : entry));
    if (isAuthenticated && typeof item.id === "number") {
      updateContent.mutate({ id: item.id, values: { isFavorite: nextFavorite } });
    }
  };

  const changeStatus = (item: ContentItem, status: Status) => {
    setItems(current => current.map(entry => entry.id === item.id ? { ...entry, status } : entry));
    if (isAuthenticated && typeof item.id === "number") updateContent.mutate({ id: item.id, values: { status } });
    toast.success(`Estado cambiado a ${statusCopy[status].label.toLowerCase()}.`);
  };

  const scheduleItem = (item: ContentItem, date: Date) => {
    const scheduledAt = new Date(date);
    scheduledAt.setHours(10, 0, 0, 0);
    setItems(current => current.map(entry => entry.id === item.id ? { ...entry, scheduledAt, status: entry.status === "published" ? entry.status : "ready" } : entry));
    if (isAuthenticated && typeof item.id === "number") updateContent.mutate({ id: item.id, values: { scheduledAt: scheduledAt.toISOString(), status: item.status === "published" ? "published" : "ready" } });
    toast.success(`“${item.title}” programado para el ${scheduledAt.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}.`);
  };

  const copyItem = async (item: ContentItem) => {
    const text = item.body || item.description || item.url || item.title;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Contenido copiado.");
    } catch {
      toast.info("Selecciona y copia el contenido desde la ficha.");
    }
  };

  const shareExternally = async (item: ContentItem) => {
    const text = [item.body || item.description || item.title, item.tags ? `\n#${item.tags.split(",").join(" #")}` : ""].join("");
    try {
      if (typeof navigator.share === "function") await navigator.share({ title: item.title, text, url: item.url || window.location.href });
      else await navigator.clipboard.writeText(text);
      toast.success(typeof navigator.share === "function" ? "Se abrió el menú de compartir." : "Texto y hashtags copiados.");
    } catch {
      toast.info("Puedes copiar el texto desde la ficha.");
    }
  };

  const openShare = (item?: ContentItem, collectionName?: string) => {
    if (!isAuthenticated) {
      toast.info("Inicia sesión para crear enlaces privados.");
      startLogin();
      return;
    }
    setShareUrl("");
    setShareId(null);
    setShareTarget(item ? { kind: "content", title: item.title, contentId: typeof item.id === "number" ? item.id : undefined } : { kind: "collection", title: collectionName || "Colección", collectionName });
  };

  const createPrivateShare = () => {
    if (!shareTarget) return;
    createShare.mutate({ ...shareTarget, expiresAt: undefined }, {
      onSuccess: result => {
        const url = `${window.location.origin}${result.url}`;
        setShareUrl(url);
        setShareId(result.id);
        navigator.clipboard?.writeText(url);
        toast.success("Enlace privado creado y copiado.");
      },
      onError: error => toast.error(error.message || "No se pudo crear el enlace."),
    });
  };

  const displayName = user?.name?.split(" ")[0] || "tu biblioteca";
  const title = activeSection === "Inicio" ? `Hola, ${displayName}` : activeSection;
  const subtitle = activeSection === "Inicio" ? "Tu espacio para guardar lo que quieres volver a encontrar." : activeSection === "Favoritos" ? "Lo que marcaste para tener siempre a mano." : activeSection === "Enlaces compartidos" ? "Controla quién puede ver tus notas y colecciones." : "Encuentra, organiza y reutiliza tu contenido.";

  if (loading) {
    return <div className="min-h-screen bg-[#f7f7f2] grid place-items-center text-[#687078]"><div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#ef795d] animate-pulse" /> Preparando tu espacio...</div></div>;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#253039] selection:bg-[#f2b4a4]/40">
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
      {mobileMenu && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-[#24313a]/30 lg:hidden" onClick={() => setMobileMenu(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-[#e7e5dd] bg-[#fbfbf7] px-5 py-6 transition-transform duration-200 lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <button className="group flex items-center gap-3 text-left" onClick={() => selectSection("Inicio")}>
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#ef795d] text-white shadow-[0_8px_20px_rgba(239,121,93,.25)] transition-transform group-active:scale-95"><Sparkles size={19} /></span>
            <span><span className="block font-serif text-[21px] leading-5 tracking-[-.02em] text-[#26333a]">Mi biblioteca</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[.18em] text-[#a5a9a3]">contenido personal</span></span>
          </button>
          <button className="rounded-lg p-2 text-[#89918d] lg:hidden" onClick={() => setMobileMenu(false)}><X size={18} /></button>
        </div>

        <button onClick={() => openComposer("note")} className="mt-10 flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#29373d] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(41,55,61,.14)] transition hover:-translate-y-0.5 active:scale-[.98]"><Plus size={17} /> Crear contenido <kbd className="ml-auto hidden rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-white/70 xl:block">N</kbd></button>

        <div className="mt-9 flex-1">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#a6aba6]">Espacio de trabajo</p>
          <nav className="space-y-1">
            {sections.map(({ label, icon: Icon }) => {
              const active = activeSection === label;
              return <button key={label} onClick={() => selectSection(label)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? "bg-[#fff0eb] text-[#db674f]" : "text-[#68747a] hover:bg-[#f1f1eb] hover:text-[#28363c]"}`}><Icon size={17} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span>{label === "Favoritos" && <span className="ml-auto text-[11px] text-[#a6aaa6]">{stats.favorites}</span>}</button>;
            })}
            <button onClick={() => toast.info("La papelera estará disponible en la próxima versión.")} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#68747a] transition hover:bg-[#f1f1eb] hover:text-[#28363c]"><Trash2 size={17} strokeWidth={1.8} /><span>Papelera</span></button>
          </nav>

          <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#a6aba6]">Colecciones</p>
          <div className="space-y-1.5 px-3">
            {["Promociones", "Ideas", "Recursos de marca"].map((collection, index) => <button key={collection} onClick={() => { setActiveSection("Colecciones"); setQuery(collection); setMobileMenu(false); }} className="flex w-full items-center gap-2 text-left text-[12px] text-[#78817f] transition hover:text-[#28363c]"><span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#ef795d]" : index === 1 ? "bg-[#b9a9ed]" : "bg-[#80c7a5]"}`} />{collection}</button>)}
          </div>
        </div>

        <div className="border-t border-[#eceae2] pt-4">
          <button onClick={() => toast.info("Ajustes de biblioteca en preparación.")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#68747a] transition hover:bg-[#f1f1eb] hover:text-[#28363c]"><Settings2 size={17} strokeWidth={1.8} /> Ajustes</button>
          {isAuthenticated ? <button onClick={() => logout()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[12px] text-[#9a817a] transition hover:text-[#db674f]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#f3d8d0] text-[11px] font-bold text-[#a85f4e]">{(user?.name || "U").slice(0, 1).toUpperCase()}</span><span className="truncate">{user?.name || "Mi cuenta"}</span><span className="ml-auto text-[10px]">Salir</span></button> : <button onClick={() => startLogin()} className="mt-1 flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold text-[#db674f]">Iniciar sesión <ArrowUpRight size={13} /></button>}
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[258px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e8e6de]/80 bg-[#f7f7f2]/90 px-5 backdrop-blur-md sm:px-8 lg:px-11">
          <div className="flex items-center gap-3"><button className="rounded-xl p-2 text-[#69757a] hover:bg-white lg:hidden" onClick={() => setMobileMenu(true)}><Menu size={20} /></button><div className="relative hidden w-[270px] sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa19d]" size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar en tu biblioteca..." className="h-10 w-full rounded-xl border border-[#e6e5dc] bg-white/70 pl-10 pr-12 text-[13px] text-[#344149] outline-none transition placeholder:text-[#aeb2ae] focus:border-[#efb0a0] focus:bg-white" /><kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-[#f4f3ee] px-1.5 py-0.5 text-[10px] font-medium text-[#a0a49f]">⌘ K</kbd></div><span className="text-[12px] font-medium text-[#89928f] sm:hidden">{activeSection}</span></div>
          <div className="flex items-center gap-2 sm:gap-4"><button className="relative rounded-xl p-2.5 text-[#7d8889] transition hover:bg-white hover:text-[#29373d]" onClick={() => toast.info("No tienes notificaciones nuevas.")}><Bell size={18} strokeWidth={1.8} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ef795d]" /></button>{!isAuthenticated && <button onClick={() => startLogin()} className="hidden rounded-xl bg-[#29373d] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#3b4b52] sm:block">Guardar mi contenido</button>}<button className="grid h-9 w-9 place-items-center rounded-full bg-[#d9e7df] text-[12px] font-bold text-[#46715e]" onClick={() => isAuthenticated ? toast.success("Tu cuenta está activa.") : startLogin()}>{(user?.name || "T").slice(0, 1).toUpperCase()}</button></div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-11 lg:py-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#ef795d]">{activeSection === "Inicio" ? "Tu espacio creativo" : "Biblioteca de contenido"}</p><h1 className="font-serif text-[35px] leading-none tracking-[-.04em] text-[#28363d] sm:text-[43px]">{title}</h1><p className="mt-3 text-[13px] text-[#7a8587]">{subtitle}</p></div><div className="flex items-center gap-2"><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-[#e1dfd6] bg-white px-3.5 py-2.5 text-[12px] font-semibold text-[#56636a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#efb0a0]"><ImageIcon size={15} /> <span className="hidden sm:inline">Subir archivo</span><span className="sm:hidden">Subir</span></button><button onClick={() => openComposer("note")} className="flex items-center gap-2 rounded-xl bg-[#ef795d] px-3.5 py-2.5 text-[12px] font-semibold text-white shadow-[0_8px_18px_rgba(239,121,93,.2)] transition hover:-translate-y-0.5 active:scale-[.98]"><Plus size={16} /> Nuevo</button></div></div>

          {activeSection === "Inicio" && <>
            <section className="mt-9 grid gap-4 md:grid-cols-[1.55fr_1fr_1fr]">
              <div className="relative overflow-hidden rounded-[22px] bg-[#29373d] p-6 text-white shadow-[0_12px_30px_rgba(41,55,61,.12)] sm:p-7"><div className="relative z-10 max-w-[330px]"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#f5c2b4]"><Zap size={12} /> En foco</span><h2 className="mt-5 font-serif text-[27px] leading-[1.06] tracking-[-.02em]">Tu próximo contenido puede empezar aquí.</h2><p className="mt-3 max-w-[280px] text-[12px] leading-5 text-white/60">Guarda una idea, reúne tus recursos y conviértela en una publicación lista para compartir.</p><button onClick={() => openComposer("publication")} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ef795d] px-4 py-2.5 text-[12px] font-semibold transition hover:bg-[#f28b72]">Crear publicación <ArrowUpRight size={14} /></button></div><div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[28px] border-[#ffffff0d]" /><div className="absolute -bottom-28 right-6 h-60 w-60 rounded-full border-[38px] border-[#ffffff08]" /></div>
              <div className="rounded-[22px] border border-[#ebe9e0] bg-white p-6"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff0eb] text-[#ef795d]"><Archive size={17} /></span><span className="text-[11px] font-medium text-[#a0a8a5]">Total</span></div><p className="mt-6 text-[35px] font-semibold tracking-[-.05em] text-[#29373d]">{stats.total}</p><p className="mt-1 text-[12px] text-[#84908d]">elementos guardados</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#f3f2ec]"><div className="h-full w-[68%] rounded-full bg-[#ef795d]" /></div></div>
              <div className="rounded-[22px] border border-[#ebe9e0] bg-white p-6"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f4ed] text-[#4d9975]"><Check size={17} /></span><span className="text-[11px] font-medium text-[#a0a8a5]">Estado</span></div><p className="mt-6 text-[35px] font-semibold tracking-[-.05em] text-[#29373d]">{stats.ready}</p><p className="mt-1 text-[12px] text-[#84908d]">listos para publicar</p><div className="mt-5 flex -space-x-1.5"><span className="h-5 w-5 rounded-full border-2 border-white bg-[#f1c7b9]" /><span className="h-5 w-5 rounded-full border-2 border-white bg-[#c8bdf0]" /><span className="h-5 w-5 rounded-full border-2 border-white bg-[#b7d9c5]" /></div></div>
            </section>
            <div className="mb-8 mt-11 flex items-center justify-between"><div><h2 className="font-serif text-[25px] tracking-[-.03em] text-[#29373d]">Añadido recientemente</h2><p className="mt-1 text-[12px] text-[#8a9491]">Lo último que vive en tu biblioteca.</p></div><button onClick={() => selectSection("Biblioteca")} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#db674f] transition hover:gap-2.5">Ver todo <ArrowUpRight size={14} /></button></div>
          </>}

          {activeSection === "Calendario" && <CalendarPanel items={items} onSchedule={scheduleItem} onStatus={changeStatus} />}
          {activeSection === "Enlaces compartidos" && <ShareAdminPanel links={shareLinksQuery.data || []} onDeactivate={id => deactivateShare.mutate({ id }, { onSuccess: () => { toast.success("Enlace desactivado."); shareLinksQuery.refetch(); } })} />}
          {activeSection === "Publicaciones" && <PublishPanel items={items.filter(item => item.type === "publication" || item.status === "ready")} onShare={shareExternally} />}

          <section className={activeSection === "Inicio" || activeSection === "Calendario" ? "mt-8" : "mt-9"} style={{ display: activeSection === "Enlaces compartidos" ? "none" : undefined }}>
            <div className="mb-5 flex flex-col gap-3 rounded-[18px] border border-[#ebe9e0] bg-white/60 p-2.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-1 overflow-x-auto"><button onClick={() => setActiveFilter("all")} className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${activeFilter === "all" ? "bg-[#29373d] text-white" : "text-[#7c8786] hover:bg-[#f1f1eb]"}`}>Todo</button>{(["image", "note", "link", "publication"] as ContentType[]).map(type => <button key={type} onClick={() => setActiveFilter(type)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold capitalize transition ${activeFilter === type ? "bg-[#fff0eb] text-[#db674f]" : "text-[#7c8786] hover:bg-[#f1f1eb]"}`}><TypeIcon type={type} size={13} />{type === "image" ? "Fotos" : type === "note" ? "Notas" : type === "link" ? "Enlaces" : "Publicaciones"}</button>)}</div><div className="flex items-center justify-between gap-2 px-1 sm:justify-end"><button onClick={() => setQuery("")} className="flex items-center gap-1.5 text-[11px] text-[#9aa19d] hover:text-[#db674f]"><Filter size={13} /> {query ? `Filtrado por “${query}”` : "Filtros"}</button><span className="h-4 w-px bg-[#e8e7df]" /><button onClick={() => setView("grid")} className={`rounded-lg p-1.5 ${view === "grid" ? "bg-[#f0efea] text-[#3b4a4f]" : "text-[#a0a8a5]"}`}><Grid2X2 size={15} /></button><button onClick={() => setView("list")} className={`rounded-lg p-1.5 ${view === "list" ? "bg-[#f0efea] text-[#3b4a4f]" : "text-[#a0a8a5]"}`}><List size={15} /></button></div></div>

            {visibleItems.length === 0 ? <div className="rounded-[22px] border border-dashed border-[#dddcd2] bg-white/50 px-6 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0eb] text-[#ef795d]"><Search size={20} /></span><h3 className="mt-4 font-serif text-[21px] text-[#29373d]">No encontramos nada</h3><p className="mt-2 text-[12px] text-[#8b9492]">Prueba con otra palabra o crea un contenido nuevo.</p><button onClick={() => { setQuery(""); setActiveFilter("all"); }} className="mt-5 rounded-xl bg-[#29373d] px-4 py-2.5 text-[12px] font-semibold text-white">Limpiar filtros</button></div> : <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>{visibleItems.map((item, index) => <ContentCard key={item.id} item={item} index={index} view={view} onFavorite={() => toggleFavorite(item)} onCopy={() => copyItem(item)} onShare={() => openShare(item)} />)}</div>}
          </section>

          <div className="mt-12 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="rounded-[22px] border border-[#ebe9e0] bg-white p-6 sm:p-7"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a4aaa5]">Acceso rápido</p><h2 className="mt-2 font-serif text-[23px] tracking-[-.03em]">Guardar sin pensarlo mucho</h2></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2f0ff] text-[#7967cf]"><Sparkles size={17} /></span></div><div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><QuickAction icon={<NotebookPen size={17} />} label="Nueva nota" tone="purple" onClick={() => openComposer("note")} /><QuickAction icon={<Link2 size={17} />} label="Guardar enlace" tone="green" onClick={() => openComposer("link")} /><QuickAction icon={<ImageIcon size={17} />} label="Subir foto o video" tone="orange" onClick={() => fileInputRef.current?.click()} /><QuickAction icon={<Send size={17} />} label="Compartir colección" tone="green" onClick={() => openShare(undefined, "Promociones")} /></div></div>
            <div className="rounded-[22px] bg-[#fff1ec] p-6 sm:p-7"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#c67564]">Próximo paso</p><h2 className="mt-2 font-serif text-[23px] leading-tight tracking-[-.03em] text-[#533b37]">Tienes {stats.ideas} ideas esperando convertirse en algo.</h2></div><span className="text-[28px]">✦</span></div><button onClick={() => { setActiveSection("Biblioteca"); setActiveFilter("note"); }} className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#c55f4c]">Ver mis ideas <ArrowUpRight size={14} /></button></div>
          </div>

          <footer className="mt-12 flex flex-col justify-between gap-2 border-t border-[#e7e5dd] py-6 text-[11px] text-[#a0a7a3] sm:flex-row"><span>Biblioteca de Contenido · Tu espacio, a tu ritmo.</span><span>{isAuthenticated ? "Sincronizado" : "Modo demo · inicia sesión para guardar"}</span></footer>
        </div>
      </main>

      {showComposer && <Composer type={composerType} setType={setComposerType} title={newTitle} body={newBody} category={newCategory} platform={newPlatform} scheduledAt={newScheduledAt} setTitle={setNewTitle} setBody={setNewBody} setCategory={setNewCategory} setPlatform={setNewPlatform} setScheduledAt={setNewScheduledAt} onClose={resetComposer} onSave={addItem} saving={createContent.isPending} />}
      {shareTarget && <ShareDialog target={shareTarget} shareUrl={shareUrl} shareId={shareId} onClose={() => { setShareTarget(null); setShareUrl(""); setShareId(null); }} onCreate={createPrivateShare} onDeactivate={() => { if (shareId) { deactivateShare.mutate({ id: shareId }, { onSuccess: () => toast.success("Enlace desactivado.") }); } setShareTarget(null); setShareUrl(""); setShareId(null); }} creating={createShare.isPending} />}
    </div>
  );
}

function ContentCard({ item, index, view, onFavorite, onCopy, onShare }: { item: ContentItem; index: number; view: "grid" | "list"; onFavorite: () => void; onCopy: () => void; onShare: () => void }) {
  const status = statusCopy[item.status];
  const tags = (item.tags || "").split(",").map(tag => tag.trim()).filter(Boolean).slice(0, 2);
  if (view === "list") return <article className="group flex items-center gap-4 rounded-[18px] border border-[#ebe9e0] bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(61,70,65,.08)]"><div className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl ${item.image ? "bg-cover bg-center" : "bg-[#f1f0ea] text-[#8d9892]"}`} style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}>{!item.image && <TypeIcon type={item.type} />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-[13px] font-semibold text-[#344149]">{item.title}</h3><span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${status.className}`}>{status.label}</span></div><p className="mt-1 truncate text-[11px] text-[#8d9795]">{item.description || item.body || item.url}</p></div><span className="hidden text-[11px] text-[#a3aaa6] sm:block">{item.category}</span><button onClick={onFavorite} className={`rounded-lg p-2 transition ${item.isFavorite ? "text-[#ef795d]" : "text-[#b4bbb6] hover:text-[#ef795d]"}`}><Heart size={15} fill={item.isFavorite ? "currentColor" : "none"} /></button><button onClick={onCopy} className="rounded-lg p-2 text-[#a6aeaa] hover:bg-[#f4f3ed] hover:text-[#344149]"><Copy size={15} /></button></article>;
  return <article className="group overflow-hidden rounded-[20px] border border-[#ebe9e0] bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(61,70,65,.09)]" style={{ animationDelay: `${index * 35}ms` }}><div className={`relative ${item.image ? "h-[168px]" : "h-[148px]"} overflow-hidden ${item.image ? "bg-cover bg-center" : item.type === "link" ? "bg-[#eef3f1]" : item.type === "publication" ? "bg-[#fff0eb]" : "bg-[#f0edff]"}`} style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}>{!item.image && <div className="absolute inset-0 grid place-items-center"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${item.type === "link" ? "bg-white text-[#5a9a7a]" : item.type === "publication" ? "bg-white text-[#ef795d]" : "bg-white text-[#7765cf]"} shadow-sm`}><TypeIcon type={item.type} size={21} /></span></div>}<div className="absolute left-3 top-3 flex items-center gap-1.5"><span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#5d696d] backdrop-blur-sm"><TypeIcon type={item.type} size={11} /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span></div><div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100"><button onClick={onFavorite} className={`grid h-8 w-8 place-items-center rounded-full bg-white/90 backdrop-blur-sm transition ${item.isFavorite ? "text-[#ef795d]" : "text-[#6e7979] hover:text-[#ef795d]"}`}><Heart size={14} fill={item.isFavorite ? "currentColor" : "none"} /></button><button onClick={onShare} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#6e7979] backdrop-blur-sm hover:text-[#344149]"><Send size={14} /></button></div></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-[14px] font-semibold text-[#344149]">{item.title}</h3><p className="mt-1.5 line-clamp-2 min-h-[32px] text-[11px] leading-4 text-[#8b9593]">{item.description || item.body || item.url || "Sin descripción todavía."}</p></div><button onClick={onFavorite} className={`shrink-0 rounded-lg p-1 transition ${item.isFavorite ? "text-[#ef795d]" : "text-[#b6bdb8] opacity-0 group-hover:opacity-100 hover:text-[#ef795d]"}`}><Heart size={15} fill={item.isFavorite ? "currentColor" : "none"} /></button></div><div className="mt-4 flex items-center justify-between"><div className="flex min-w-0 items-center gap-1.5">{tags.map(tag => <span key={tag} className="max-w-[100px] truncate rounded-md bg-[#f5f4ee] px-2 py-1 text-[10px] text-[#8b9490]">#{tag}</span>)}{item.category && <span className="truncate text-[10px] text-[#a5aba7]">{item.category}</span>}</div><span className="shrink-0 text-[10px] text-[#b0b5b1]">{formatDate(item.createdAt)}</span></div></div></article>;
}

function QuickAction({ icon, label, tone, onClick }: { icon: React.ReactNode; label: string; tone: "purple" | "green" | "orange"; onClick: () => void }) {
  const tones = { purple: "bg-[#f0edff] text-[#7864cd]", green: "bg-[#e8f4ed] text-[#4a9874]", orange: "bg-[#fff0eb] text-[#e7755b]" };
  return <button onClick={onClick} className="flex items-center gap-2.5 rounded-xl border border-[#efeee8] bg-[#fcfcf9] px-3 py-3 text-left text-[11px] font-semibold text-[#627075] transition hover:-translate-y-0.5 hover:border-[#dddcd2] hover:bg-white"><span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}>{icon}</span><span>{label}</span></button>;
}

function Composer({ type, setType, title, body, category, platform, scheduledAt, setTitle, setBody, setCategory, setPlatform, setScheduledAt, onClose, onSave, saving }: { type: ContentType; setType: (value: ContentType) => void; title: string; body: string; category: string; platform: string; scheduledAt: string; setTitle: (value: string) => void; setBody: (value: string) => void; setCategory: (value: string) => void; setPlatform: (value: string) => void; setScheduledAt: (value: string) => void; onClose: () => void; onSave: () => void; saving: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#26343a]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" className="w-full max-w-[540px] rounded-t-[26px] border border-white/80 bg-[#fbfbf7] p-5 shadow-[0_24px_70px_rgba(31,44,49,.22)] sm:rounded-[26px] sm:p-7"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#ef795d]">Nuevo contenido</p><h2 className="mt-2 font-serif text-[28px] tracking-[-.04em] text-[#29373d]">Añade algo a tu espacio</h2></div><button onClick={onClose} className="rounded-xl p-2 text-[#9da5a2] hover:bg-[#f0f0ea] hover:text-[#3e4b50]"><X size={18} /></button></div><div className="mt-6 grid grid-cols-4 gap-2">{(["note", "link", "image", "publication"] as ContentType[]).map(option => <button key={option} onClick={() => setType(option)} className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[10px] font-semibold transition ${type === option ? "border-[#f2b2a1] bg-[#fff0eb] text-[#d9674e]" : "border-[#e8e7df] text-[#8d9692] hover:bg-white"}`}><TypeIcon type={option} size={16} />{option === "note" ? "Nota" : option === "link" ? "Enlace" : option === "image" ? "Foto" : "Publicación"}</button>)}</div><div className="mt-5 space-y-3"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Título del contenido" className="h-12 w-full rounded-xl border border-[#e4e3da] bg-white px-4 text-[13px] font-medium text-[#344149] outline-none placeholder:text-[#aeb4af] focus:border-[#efb0a0]" /><textarea value={body} onChange={event => setBody(event.target.value)} placeholder={type === "link" ? "Pega aquí el enlace o escribe una nota sobre él..." : "Escribe una idea, texto o contexto para volver a encontrarlo..."} className="min-h-[112px] w-full resize-none rounded-xl border border-[#e4e3da] bg-white px-4 py-3 text-[13px] leading-5 text-[#344149] outline-none placeholder:text-[#aeb4af] focus:border-[#efb0a0]" /><div className="grid gap-3 sm:grid-cols-2"><div className="relative"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a5ada8]" size={14} /><input value={category} onChange={event => setCategory(event.target.value)} placeholder="Categoría" className="h-10 w-full rounded-xl border border-[#e4e3da] bg-white pl-9 pr-3 text-[12px] text-[#344149] outline-none focus:border-[#efb0a0]" /></div><div className="relative"><Send className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a5ada8]" size={14} /><input value={platform} onChange={event => setPlatform(event.target.value)} placeholder="Plataforma (opcional)" className="h-10 w-full rounded-xl border border-[#e4e3da] bg-white pl-9 pr-3 text-[12px] text-[#344149] outline-none focus:border-[#efb0a0]" /></div></div></div><div className="mt-4 flex items-center gap-3 rounded-xl border border-[#e4e3da] bg-white px-3 py-2.5"><CalendarDays size={15} className="text-[#ef795d]" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9aa29e]">Programar publicación</p><input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="mt-1 w-full bg-transparent text-[12px] text-[#344149] outline-none" /></div><button type="button" onClick={() => setScheduledAt("")} className="text-[11px] text-[#9aa29e] hover:text-[#ef795d]">Quitar</button></div><div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#7c8785] hover:bg-[#f0f0ea]">Cancelar</button><button onClick={onSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#29373d] px-5 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#3e4e55] disabled:cursor-wait disabled:opacity-70">{saving ? "Guardando..." : "Guardar en biblioteca"}<ArrowUpRight size={14} /></button></div></div></div>;
}


function CalendarPanel({ items, onSchedule, onStatus }: { items: ContentItem[]; onSchedule: (item: ContentItem, date: Date) => void; onStatus: (item: ContentItem, status: Status) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? new Date(year, month, day) : null;
  });
  const scheduledItems = items.filter(item => item.scheduledAt);
  const selectedItems = scheduledItems.filter(item => sameDay(new Date(item.scheduledAt as string | Date), selected));
  const unscheduledItems = items.filter(item => !item.scheduledAt && item.status !== "published").slice(0, 5);
  const monthLabel = cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return <div className="rounded-[22px] border border-[#ebe9e0] bg-white p-4 sm:p-6">
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div>
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#ef795d]">Planificación</p><h2 className="mt-2 font-serif text-[25px] capitalize tracking-[-.03em]">{monthLabel}</h2></div><div className="flex gap-1"><button onClick={() => setCursor(new Date(year, month - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-[#e8e7df] text-[#7e8987] hover:bg-[#f6f5ef]">‹</button><button onClick={() => { const today = new Date(); setCursor(today); setSelected(today); }} className="rounded-xl border border-[#e8e7df] px-3 text-[11px] font-semibold text-[#7e8987] hover:bg-[#f6f5ef]">Hoy</button><button onClick={() => setCursor(new Date(year, month + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-[#e8e7df] text-[#7e8987] hover:bg-[#f6f5ef]">›</button></div></div>
        <div className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-[.08em] text-[#a6ada8]">{["L", "M", "X", "J", "V", "S", "D"].map(day => <span key={day} className="py-2">{day}</span>)}{cells.map((date, index) => date ? <button key={index} onClick={() => setSelected(date)} className={`relative flex min-h-[52px] flex-col items-center justify-start rounded-xl py-2 text-[12px] transition ${sameDay(date, selected) ? "bg-[#29373d] font-bold text-white" : sameDay(date, new Date()) ? "bg-[#fff0eb] font-bold text-[#db674f]" : "text-[#667276] hover:bg-[#f5f4ee]"}`}><span>{date.getDate()}</span>{scheduledItems.some(item => sameDay(new Date(item.scheduledAt as string | Date), date)) && <span className={`mt-1 h-1.5 w-1.5 rounded-full ${sameDay(date, selected) ? "bg-[#efb29f]" : "bg-[#ef795d]"}`} />}</button> : <span key={index} />)}</div>
      </div>
      <div className="rounded-[18px] bg-[#f8f7f2] p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa29e]">Agenda del día</p><h3 className="mt-2 font-serif text-[21px] capitalize text-[#344149]">{selected.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</h3>{selectedItems.length ? <div className="mt-4 space-y-2">{selectedItems.map(item => <div key={item.id} className="rounded-xl border border-[#eceae1] bg-white p-3"><div className="flex items-start justify-between gap-2"><p className="text-[12px] font-semibold text-[#344149]">{item.title}</p><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${statusCopy[item.status].className}`}>{statusCopy[item.status].label}</span></div><div className="mt-3 flex gap-1.5"><button onClick={() => onStatus(item, item.status === "published" ? "ready" : "published")} className="rounded-lg bg-[#29373d] px-2.5 py-1.5 text-[10px] font-semibold text-white">{item.status === "published" ? "Volver a listo" : "Marcar publicado"}</button><button onClick={() => onSchedule(item, new Date())} className="rounded-lg border border-[#e4e3da] px-2.5 py-1.5 text-[10px] font-semibold text-[#7c8785]">Hoy</button></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-[#deddd3] px-4 py-5 text-center"><p className="text-[11px] leading-5 text-[#929b97]">No hay publicaciones para este día.</p>{unscheduledItems.length > 0 && <p className="mt-2 text-[10px] font-semibold text-[#db674f]">Programa una idea desde la lista.</p>}</div>}</div>
    </div>
    {unscheduledItems.length > 0 && <div className="mt-6 border-t border-[#eceae3] pt-5"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa29e]">Sin fecha</p><span className="text-[10px] text-[#a7ada9]">Selecciona un día arriba</span></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{unscheduledItems.map(item => <button key={item.id} onClick={() => onSchedule(item, selected)} className="flex min-w-[170px] items-center gap-2 rounded-xl border border-[#e8e7df] bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-[#efb0a0]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f0edff] text-[#7864cd]"><TypeIcon type={item.type} size={13} /></span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-[#546269]">{item.title}</span><span className="block text-[10px] text-[#a1aaa5]">Programar aquí</span></span></button>)}</div></div>}
  </div>;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function ShareDialog({ target, shareUrl, shareId, onClose, onCreate, onDeactivate, creating }: { target: { kind: "content" | "collection"; title: string; contentId?: number; collectionName?: string }; shareUrl: string; shareId: number | null; onClose: () => void; onCreate: () => void; onDeactivate: () => void; creating: boolean }) {
  const cannotCreate = target.kind === "content" && !target.contentId;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#26343a]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" className="w-full max-w-[500px] rounded-t-[26px] border border-white/80 bg-[#fbfbf7] p-5 shadow-[0_24px_70px_rgba(31,44,49,.22)] sm:rounded-[26px] sm:p-7"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#ef795d]">Compartir de forma privada</p><h2 className="mt-2 font-serif text-[28px] tracking-[-.04em] text-[#29373d]">{target.title}</h2></div><button onClick={onClose} className="rounded-xl p-2 text-[#9da5a2] hover:bg-[#f0f0ea]"><X size={18} /></button></div><p className="mt-4 text-[12px] leading-5 text-[#7e8987]">Crea un enlace secreto de solo lectura para enviarlo a tus contactos. Puedes dejar de compartirlo cuando quieras.</p>{shareUrl ? <div className="mt-5 rounded-2xl bg-[#e8f4ed] p-4"><p className="text-[11px] font-semibold text-[#377557]">Enlace activo y copiado</p><div className="mt-2 flex items-center gap-2"><input readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border border-[#cbe4d5] bg-white px-3 py-2 text-[11px] text-[#4a6e5b] outline-none" /><button onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success("Enlace copiado."); }} className="rounded-lg bg-[#4d9975] px-3 py-2 text-[11px] font-semibold text-white">Copiar</button></div></div> : <div className="mt-5 rounded-2xl border border-[#eceae1] bg-white p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0eb] text-[#ef795d]"><Link2 size={18} /></span><div><p className="text-[12px] font-semibold text-[#344149]">Enlace privado</p><p className="mt-1 text-[11px] text-[#929b97]">Solo quien tenga este enlace podrá verlo.</p></div></div></div>}{cannotCreate && <p className="mt-3 text-[11px] text-[#b26a58]">Este contenido de demostración debe guardarse primero como contenido real para poder compartirlo.</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#7c8785] hover:bg-[#f0f0ea]">Cerrar</button>{shareUrl && shareId && <button onClick={onDeactivate} className="rounded-xl border border-[#f0c5ba] px-4 py-2.5 text-[12px] font-semibold text-[#c55f4c] hover:bg-[#fff0eb]">Desactivar enlace</button>}{!shareUrl && <button disabled={creating || cannotCreate} onClick={onCreate} className="rounded-xl bg-[#29373d] px-5 py-2.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{creating ? "Creando..." : "Crear enlace privado"}</button>}</div></div></div>;
}


function ShareAdminPanel({ links, onDeactivate }: { links: Array<{ id: number; token: string; kind: "content" | "collection"; title: string; isActive: boolean; createdAt: Date | string; expiresAt?: Date | string | null }>; onDeactivate: (id: number) => void }) {
  return <div className="rounded-[22px] border border-[#ebe9e0] bg-white p-5 sm:p-7"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#ef795d]">Privacidad</p><h2 className="mt-2 font-serif text-[27px] tracking-[-.03em]">Enlaces compartidos</h2><p className="mt-2 text-[12px] text-[#84908d]">Revoca el acceso cuando quieras. Los enlaces inactivos dejan de mostrar contenido.</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f4ed] text-[#4a9874]"><Link2 size={18} /></span></div>{links.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-[#deddd3] px-5 py-10 text-center"><p className="text-sm font-semibold text-[#667276]">Aún no tienes enlaces compartidos</p><p className="mt-2 text-xs text-[#9aa29e]">Usa el icono de compartir en una tarjeta o crea un enlace de colección.</p></div> : <div className="mt-7 space-y-3">{links.map(link => { const url = `${window.location.origin}/share/${link.token}`; return <div key={link.id} className="flex flex-col gap-3 rounded-2xl border border-[#ebe9e0] bg-[#fcfcf9] p-4 sm:flex-row sm:items-center"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${link.kind === "collection" ? "bg-[#f0edff] text-[#7864cd]" : "bg-[#fff0eb] text-[#ef795d]"}`}><Link2 size={17} /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-[13px] font-semibold text-[#344149]">{link.title}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${link.isActive ? "bg-[#e8f4ed] text-[#4a9874]" : "bg-[#f0f0ea] text-[#9aa29e]"}`}>{link.isActive ? "Activo" : "Revocado"}</span></div><p className="mt-1 truncate text-[11px] text-[#99a29f]">Creado el {new Date(link.createdAt).toLocaleDateString("es-ES")} · {link.kind === "collection" ? "Colección" : "Contenido individual"}</p></div><div className="flex gap-2"><button disabled={!link.isActive} onClick={() => { navigator.clipboard?.writeText(url); toast.success("Enlace copiado."); }} className="rounded-lg border border-[#e4e3da] px-3 py-2 text-[11px] font-semibold text-[#69767a] disabled:opacity-40">Copiar</button><a href={`/share/${link.token}`} target="_blank" rel="noreferrer" className={`rounded-lg border border-[#e4e3da] px-3 py-2 text-[11px] font-semibold text-[#69767a] ${!link.isActive ? "pointer-events-none opacity-40" : ""}`}>Abrir</a>{link.isActive && <button onClick={() => onDeactivate(link.id)} className="rounded-lg border border-[#f0c5ba] px-3 py-2 text-[11px] font-semibold text-[#c55f4c]">Revocar</button>}</div></div>; })}</div>}</div>;
}


function PublishPanel({ items, onShare }: { items: ContentItem[]; onShare: (item: ContentItem) => void }) {
  const providers = [
    { name: "Instagram", detail: "Conector pendiente de habilitar", tone: "bg-[#fff0eb] text-[#d9674e]", action: "Preparar contenido" },
    { name: "WhatsApp", detail: "Usa el menú de compartir del dispositivo", tone: "bg-[#e8f4ed] text-[#4a9874]", action: "Compartir" },
    { name: "Facebook", detail: "Puedes copiar y pegar tu publicación", tone: "bg-[#eef2ff] text-[#5f72c7]", action: "Copiar y compartir" },
  ];
  return <div className="rounded-[22px] border border-[#ebe9e0] bg-white p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#ef795d]">Centro de publicación</p><h2 className="mt-2 font-serif text-[27px] tracking-[-.03em]">Comparte sin salir de tu biblioteca</h2><p className="mt-2 max-w-xl text-[12px] leading-5 text-[#84908d]">Elige una publicación lista y usa el menú de tu dispositivo para enviarla a WhatsApp, Instagram u otra aplicación. La publicación original permanece intacta.</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff0eb] text-[#ef795d]"><Send size={18} /></span></div><div className="mt-6 grid gap-3 md:grid-cols-3">{providers.map(provider => <div key={provider.name} className="rounded-2xl border border-[#eceae1] bg-[#fcfcf9] p-4"><div className={`grid h-9 w-9 place-items-center rounded-xl ${provider.tone}`}><Send size={16} /></div><h3 className="mt-4 text-[13px] font-semibold text-[#344149]">{provider.name}</h3><p className="mt-1 min-h-[32px] text-[11px] leading-4 text-[#929b97]">{provider.detail}</p><button onClick={() => { if (provider.name === "Instagram") toast.info("Para publicación directa hay que habilitar el conector de Instagram."); else if (items[0]) onShare(items[0]); else toast.info("Primero crea una publicación lista."); }} className="mt-4 rounded-lg border border-[#e4e3da] px-3 py-2 text-[10px] font-bold text-[#69767a] hover:bg-white">{provider.action}</button></div>)}</div>{items.length > 0 ? <div className="mt-7 border-t border-[#eceae3] pt-5"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa29e]">Listas para compartir</p><span className="text-[10px] text-[#a7ada9]">{items.length} disponibles</span></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{items.slice(0, 6).map(item => <button key={item.id} onClick={() => onShare(item)} className="flex min-w-[190px] items-center gap-3 rounded-xl border border-[#e8e7df] bg-white px-3 py-2.5 text-left hover:border-[#efb0a0]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0edff] text-[#7864cd]"><TypeIcon type={item.type} size={14} /></span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-[#546269]">{item.title}</span><span className="mt-0.5 block text-[10px] text-[#a1aaa5]">Abrir compartir</span></span></button>)}</div></div> : <div className="mt-7 rounded-xl bg-[#f8f7f2] px-4 py-5 text-center text-xs text-[#929b97]">Aún no hay publicaciones listas. Cambia el estado de una idea o crea una publicación nueva.</div>}</div>;
}
