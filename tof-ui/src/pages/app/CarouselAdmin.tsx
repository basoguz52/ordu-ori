import {
  useState,
  type FormEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Plus,
  Images,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import {
  useAdminCarousel,
  useCreateSlide,
  useUpdateSlide,
  useDeleteSlide,
  useReorderSlides,
  type CarouselSlide,
} from "@/api/carousel";
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
import { Dialog, DialogHeader, DialogBody } from "@/components/ui/dialog";

type MetaFields = {
  title: string;
  subtitle: string;
  link_url: string;
  is_active: boolean;
};

const EMPTY_META: MetaFields = {
  title: "",
  subtitle: "",
  link_url: "",
  is_active: true,
};

function metaOf(s: CarouselSlide): MetaFields {
  return {
    title: s.title ?? "",
    subtitle: s.subtitle ?? "",
    link_url: s.link_url ?? "",
    is_active: s.is_active,
  };
}

/** Yeni görsel yükleme (dosya + meta). */
function CreateDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateSlide();
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<MetaFields>(EMPTY_META);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Bir görsel seçin.");
      return;
    }
    try {
      await create.mutateAsync({
        file,
        title: meta.title.trim() || null,
        subtitle: meta.subtitle.trim() || null,
        link_url: meta.link_url.trim() || null,
        is_active: meta.is_active,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Yüklenemedi.");
    }
  }

  return (
    <Dialog open onClose={create.isPending ? () => {} : onClose} className="max-w-lg">
      <DialogHeader title="Yeni Görsel" onClose={create.isPending ? undefined : onClose} />
      <DialogBody>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="image">Görsel (JPG, PNG, WEBP — maks. 5MB)</Label>
            <Input
              id="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="mt-2 aspect-[16/7] w-full rounded-lg border object-cover"
              />
            )}
          </div>
          <MetaInputs meta={meta} setMeta={setMeta} />
          <div className="flex gap-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Yükleniyor…" : "Yükle"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={create.isPending}
            >
              Vazgeç
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  );
}

/** Var olan slide'ın metasını düzenleme (görsel değişmez). */
function EditDialog({
  slide,
  onClose,
}: {
  slide: CarouselSlide;
  onClose: () => void;
}) {
  const update = useUpdateSlide();
  const [meta, setMeta] = useState<MetaFields>(metaOf(slide));
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        id: slide.id,
        title: meta.title.trim() || null,
        subtitle: meta.subtitle.trim() || null,
        link_url: meta.link_url.trim() || null,
        is_active: meta.is_active,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    }
  }

  return (
    <Dialog open onClose={update.isPending ? () => {} : onClose} className="max-w-lg">
      <DialogHeader title="Görseli Düzenle" onClose={update.isPending ? undefined : onClose} />
      <DialogBody>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <img
            src={slide.image_url}
            alt=""
            className="aspect-[16/7] w-full rounded-lg border object-cover"
          />
          <MetaInputs meta={meta} setMeta={setMeta} />
          <div className="flex gap-2">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={update.isPending}
            >
              Vazgeç
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  );
}

function MetaInputs({
  meta,
  setMeta,
}: {
  meta: MetaFields;
  setMeta: Dispatch<SetStateAction<MetaFields>>;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="title">Başlık (opsiyonel)</Label>
        <Input
          id="title"
          value={meta.title}
          onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subtitle">Alt Yazı (opsiyonel)</Label>
        <Textarea
          id="subtitle"
          rows={2}
          value={meta.subtitle}
          onChange={(e) => setMeta((m) => ({ ...m, subtitle: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="link_url">Tıklama Linki (opsiyonel)</Label>
        <Input
          id="link_url"
          placeholder="https://… veya /yarisma-bulteni"
          value={meta.link_url}
          onChange={(e) => setMeta((m) => ({ ...m, link_url: e.target.value }))}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={meta.is_active}
          onChange={(e) => setMeta((m) => ({ ...m, is_active: e.target.checked }))}
        />
        Yayında (anasayfada göster)
      </label>
    </>
  );
}

function SlideCard({
  slide,
  index,
  total,
  onEdit,
  onMove,
}: {
  slide: CarouselSlide;
  index: number;
  total: number;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const update = useUpdateSlide();
  const del = useDeleteSlide();

  async function toggleActive() {
    try {
      await update.mutateAsync({ id: slide.id, is_active: !slide.is_active });
    } catch {
      /* invalidate ile geri alınır */
    }
  }

  async function onDelete() {
    if (!window.confirm("Bu görsel silinsin mi?")) return;
    try {
      await del.mutateAsync(slide.id);
    } catch {
      /* noop */
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <img
        src={slide.image_url}
        alt={slide.title ?? ""}
        className="aspect-[16/7] w-full shrink-0 rounded-lg border object-cover sm:w-48"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{slide.title || "(başlıksız)"}</p>
          <Badge variant={slide.is_active ? "success" : "muted"}>
            {slide.is_active ? "Yayında" : "Pasif"}
          </Badge>
        </div>
        {slide.subtitle && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {slide.subtitle}
          </p>
        )}
        {slide.link_url && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <ExternalLink className="size-3 shrink-0" />
            {slide.link_url}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Yukarı taşı"
        >
          <ChevronUp />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label="Aşağı taşı"
        >
          <ChevronDown />
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleActive} disabled={update.isPending}>
          {slide.is_active ? <EyeOff /> : <Eye />}
          {slide.is_active ? "Gizle" : "Göster"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil /> Düzenle
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={del.isPending}>
          <Trash2 /> Sil
        </Button>
      </div>
    </Card>
  );
}

export default function CarouselAdmin() {
  const { data, isLoading, isError } = useAdminCarousel();
  const reorder = useReorderSlides();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CarouselSlide | null>(null);

  function move(index: number, dir: -1 | 1) {
    if (!data) return;
    const next = index + dir;
    if (next < 0 || next >= data.length) return;
    const ids = data.map((s) => s.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorder.mutate(ids);
  }

  return (
    <div>
      <PageHeader
        title="Anasayfa Görselleri"
        description="Anasayfadaki döner banner görsellerini yönetin. Sıra, yayında olan görsellerin gösterim sırasını belirler."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Yeni Görsel
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : isError ? (
        <EmptyState title="Görseller yüklenemedi" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Henüz görsel yok"
          description="Sağ üstteki “Yeni Görsel” ile ilk banner görselini ekleyin."
          icon={Images}
        />
      ) : (
        <div className="space-y-3">
          {data.map((s, i) => (
            <SlideCard
              key={s.id}
              slide={s}
              index={i}
              total={data.length}
              onEdit={() => setEditing(s)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </div>
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} />}
      {editing && (
        <EditDialog slide={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
