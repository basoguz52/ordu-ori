import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Image as ImageIcon,
  Megaphone,
  Newspaper,
} from "lucide-react";
import {
  useAdminPosts,
  useAdminPost,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useUploadPostCover,
  useDeletePostCover,
  useUploadPostMedia,
  useDeletePostMedia,
  useAdminPages,
  useUpsertPage,
  type PostKind,
  type PostListItem,
  type PostInput,
} from "@/api/cms";
import type { ContentPageData } from "@/api/pages";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDateTR } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<PostKind, string> = {
  announcement: "Duyuru",
  news: "Haber",
};

/** Bilinen kurumsal içerik sayfaları (henüz DB'de yoksa da düzenlenebilsin). */
const KNOWN_PAGES: { slug: string; title: string }[] = [
  { slug: "il-temsilciligi", title: "İl Temsilciliği" },
  { slug: "federasyonumuz", title: "Federasyonumuz" },
  { slug: "antrenorlerimiz", title: "Antrenörlerimiz" },
];

/* ============================ Posts ============================ */

function StatusBadge({ status }: { status: string }) {
  return status === "published" ? (
    <Badge variant="success">Yayında</Badge>
  ) : (
    <Badge variant="muted">Taslak</Badge>
  );
}

function PostEditor({
  postId,
  defaultKind,
  onClose,
}: {
  postId: number | null;
  defaultKind: PostKind;
  onClose: () => void;
}) {
  const [id, setId] = useState<number | null>(postId);
  const detail = useAdminPost(id);
  const create = useCreatePost();
  const update = useUpdatePost();
  const uploadCover = useUploadPostCover(id ?? 0);
  const deleteCover = useDeletePostCover(id ?? 0);
  const uploadMedia = useUploadPostMedia(id ?? 0);
  const deleteMedia = useDeletePostMedia(id ?? 0);

  const [form, setForm] = useState<PostInput>({
    title: "",
    kind: defaultKind,
    status: "published",
    body: "",
  });
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<number | null>(null);

  // Var olan kaydı bir kez forma doldur
  useEffect(() => {
    if (detail.data && loadedRef.current !== detail.data.id) {
      loadedRef.current = detail.data.id;
      setForm({
        title: detail.data.title,
        kind: detail.data.kind,
        status: detail.data.status === "draft" ? "draft" : "published",
        body: detail.data.body ?? "",
      });
    }
  }, [detail.data]);

  function set<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.title.trim() === "") {
      setError("Başlık zorunludur.");
      return;
    }
    const payload: PostInput = { ...form, title: form.title.trim() };
    try {
      if (id === null) {
        const res = await create.mutateAsync(payload);
        setId(res.id); // düzenleme moduna geç → kapak/medya açılır
        loadedRef.current = res.id;
      } else {
        await update.mutateAsync({ id, input: payload });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    }
  }

  const media = detail.data?.media ?? [];
  const coverUrl = detail.data?.cover_url ?? null;
  const busy = create.isPending || update.isPending;

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">
          {id === null ? "Yeni İçerik" : "İçeriği Düzenle"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X /> Kapat
        </Button>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">Başlık</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="kind">Tür</Label>
            <NativeSelect
              id="kind"
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as PostKind)}
            >
              <option value="announcement">Duyuru</option>
              <option value="news">Haber</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Durum</Label>
            <NativeSelect
              id="status"
              value={form.status}
              onChange={(e) =>
                set("status", e.target.value as PostInput["status"])
              }
            >
              <option value="published">Yayında</option>
              <option value="draft">Taslak</option>
            </NativeSelect>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="body">İçerik (HTML destekli)</Label>
          <Textarea
            id="body"
            rows={8}
            value={form.body ?? ""}
            onChange={(e) => set("body", e.target.value)}
            placeholder="Metin veya HTML girin…"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy
              ? "Kaydediliyor…"
              : id === null
                ? "Oluştur"
                : "Değişiklikleri Kaydet"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
        </div>
      </form>

      {/* Kapak & medya sadece kayıt oluşturulduktan sonra */}
      {id === null ? (
        <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
          Kapak görseli ve galeri eklemek için önce içeriği oluşturun.
        </p>
      ) : (
        <div className="mt-6 space-y-6 border-t pt-6">
          {/* Kapak */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Kapak Görseli</h3>
            <div className="flex flex-wrap items-center gap-3">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Kapak"
                  className="h-24 w-40 rounded-lg border object-cover"
                />
              ) : (
                <div className="grid h-24 w-40 place-items-center rounded-lg border border-dashed text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
              <div className="flex gap-2">
                <label
                  className={cn(
                    "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent",
                    uploadCover.isPending && "pointer-events-none opacity-50",
                  )}
                >
                  <Upload className="size-4" />
                  {uploadCover.isPending ? "Yükleniyor…" : "Görsel Seç"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCover.mutate(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {coverUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCover.mutate()}
                    disabled={deleteCover.isPending}
                  >
                    <Trash2 /> Kaldır
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Galeri */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Galeri</h3>
              <label
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent",
                  uploadMedia.isPending && "pointer-events-none opacity-50",
                )}
              >
                <Plus className="size-4" />
                {uploadMedia.isPending ? "Yükleniyor…" : "Görsel Ekle"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadMedia.mutate(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {media.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Henüz galeri görseli yok.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {media.map((m) => (
                  <div key={m.id} className="group relative">
                    <img
                      src={m.url}
                      alt={m.original_name ?? ""}
                      className="aspect-square w-full rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => deleteMedia.mutate(m.id)}
                      className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-background/90 text-destructive opacity-0 shadow transition-opacity hover:bg-background group-hover:opacity-100"
                      aria-label="Görseli sil"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function PostRow({
  p,
  onEdit,
  onDelete,
}: {
  p: PostListItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex items-center gap-4 p-3">
      {p.cover_url ? (
        <img
          src={p.cover_url}
          alt=""
          className="h-14 w-20 shrink-0 rounded-md border object-cover"
        />
      ) : (
        <div className="grid h-14 w-20 shrink-0 place-items-center rounded-md border border-dashed text-muted-foreground">
          <ImageIcon className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{p.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge status={p.status} />
          <span>{formatDateTR(p.published_at ?? p.created_at)}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil /> Düzenle
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 /> Sil
        </Button>
      </div>
    </Card>
  );
}

function PostsManager() {
  const [kind, setKind] = useState<PostKind>("announcement");
  const { data, isLoading, isError } = useAdminPosts(kind);
  const del = useDeletePost();
  // null = kapalı, "new" = yeni, number = düzenlenen id
  const [editor, setEditor] = useState<null | "new" | number>(null);

  async function onDelete(p: PostListItem) {
    if (!window.confirm(`“${p.title}” silinsin mi?`)) return;
    try {
      await del.mutateAsync(p.id);
    } catch {
      /* invalidate */
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["announcement", "news"] as PostKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                kind === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {k === "announcement" ? (
                <Megaphone className="size-4" />
              ) : (
                <Newspaper className="size-4" />
              )}
              {k === "announcement" ? "Duyurular" : "Haberler"}
            </button>
          ))}
        </div>
        <Button onClick={() => setEditor("new")} disabled={editor !== null}>
          <Plus /> Yeni {KIND_LABEL[kind]}
        </Button>
      </div>

      {editor !== null && (
        <PostEditor
          key={editor === "new" ? "new" : editor}
          postId={editor === "new" ? null : editor}
          defaultKind={kind}
          onClose={() => setEditor(null)}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="İçerikler yüklenemedi" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={`Henüz ${KIND_LABEL[kind].toLocaleLowerCase("tr")} yok`}
          description="Sağ üstteki “Yeni” ile ekleyin."
          icon={FileText}
        />
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <PostRow
              key={p.id}
              p={p}
              onEdit={() => setEditor(p.id)}
              onDelete={() => onDelete(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================= Content pages ========================= */

function PageEditor({
  page,
  slug,
  fallbackTitle,
  onClose,
}: {
  page: ContentPageData | undefined;
  slug: string;
  fallbackTitle: string;
  onClose: () => void;
}) {
  const upsert = useUpsertPage();
  const [title, setTitle] = useState(page?.title ?? fallbackTitle);
  const [body, setBody] = useState(page?.body ?? "");
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim() === "") {
      setError("Başlık zorunludur.");
      return;
    }
    try {
      await upsert.mutateAsync({ slug, input: { title: title.trim(), body } });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    }
  }

  return (
    <form onSubmit={onSave} className="mt-4 space-y-4 border-t pt-4">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`title-${slug}`}>Başlık</Label>
        <Input
          id={`title-${slug}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`body-${slug}`}>İçerik (HTML destekli)</Label>
        <Textarea
          id={`body-${slug}`}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Metin veya HTML girin…"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

function PagesManager() {
  const { data, isLoading, isError } = useAdminPages();
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) return <EmptyState title="Sayfalar yüklenemedi" />;

  const bySlug = new Map((data ?? []).map((p) => [p.slug, p]));
  // Bilinen sayfalar + DB'de olup bilinmeyenler
  const extras = (data ?? []).filter(
    (p) => !KNOWN_PAGES.some((k) => k.slug === p.slug),
  );
  const rows = [
    ...KNOWN_PAGES.map((k) => ({
      slug: k.slug,
      fallbackTitle: k.title,
      page: bySlug.get(k.slug),
    })),
    ...extras.map((p) => ({
      slug: p.slug,
      fallbackTitle: p.title,
      page: p,
    })),
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Kurumsal serbest içerik sayfaları. İçerik HTML olarak saklanır ve ilgili
        sayfada gösterilir.
      </p>
      {rows.map((r) => {
        const exists = !!r.page;
        const open = openSlug === r.slug;
        return (
          <Card key={r.slug} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{r.page?.title ?? r.fallbackTitle}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  /{r.slug}
                  {exists ? (
                    <>
                      {" · "}
                      Güncellendi: {formatDateTR(r.page!.updated_at)}
                    </>
                  ) : (
                    <> · henüz içerik girilmemiş</>
                  )}
                </p>
              </div>
              {!open && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenSlug(r.slug)}
                >
                  <Pencil /> {exists ? "Düzenle" : "İçerik Ekle"}
                </Button>
              )}
            </div>
            {open && (
              <PageEditor
                page={r.page}
                slug={r.slug}
                fallbackTitle={r.fallbackTitle}
                onClose={() => setOpenSlug(null)}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ============================ Page ============================ */

type Tab = "posts" | "pages";

export default function Content() {
  const [tab, setTab] = useState<Tab>("posts");

  return (
    <div>
      <PageHeader
        title="İçerik Yönetimi"
        description="Duyuru/haberleri ve kurumsal sayfaları yönetin."
      />

      <div className="mb-6 flex gap-2 border-b">
        {(
          [
            ["posts", "Duyurular & Haberler"],
            ["pages", "Kurumsal Sayfalar"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "posts" ? <PostsManager /> : <PagesManager />}
    </div>
  );
}
