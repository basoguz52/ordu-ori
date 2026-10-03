import { useState } from "react";
import {
  Users as UsersIcon,
  Check,
  X,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  useAdminUsers,
  useApproveUser,
  useRejectUser,
  useAssignClub,
  useClubs,
  type AdminUser,
  type UserStatus,
  type ApproveInput,
} from "@/api/admin";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDateTR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = UserStatus | "";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Bekleyenler" },
  { key: "active", label: "Aktif" },
  { key: "rejected", label: "Reddedilen" },
  { key: "", label: "Tümü" },
];

const STATUS_META: Record<UserStatus, { label: string; variant: "success" | "warning" | "muted" }> = {
  pending: { label: "Onay bekliyor", variant: "warning" },
  active: { label: "Aktif", variant: "success" },
  rejected: { label: "Reddedildi", variant: "muted" },
};

function RoleBadges({ u }: { u: AdminUser }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {u.is_admin && <Badge variant="default">Admin</Badge>}
      {u.is_club_manager && <Badge variant="secondary">Kulüp Yöneticisi</Badge>}
      {u.is_referee && <Badge variant="outline">Hakem</Badge>}
    </div>
  );
}

/** Kulüp seçici: var olan kulüp ya da yeni kulüp oluştur. */
function ClubPicker({
  clubId,
  setClubId,
  newName,
  setNewName,
  newCode,
  setNewCode,
}: {
  clubId: string;
  setClubId: (v: string) => void;
  newName: string;
  setNewName: (v: string) => void;
  newCode: string;
  setNewCode: (v: string) => void;
}) {
  const { data: clubs } = useClubs();
  const isNew = clubId === "__new__";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Kulüp</Label>
        <NativeSelect value={clubId} onChange={(e) => setClubId(e.target.value)}>
          <option value="">Kulüp seçin…</option>
          {clubs?.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name} ({c.code})
            </option>
          ))}
          <option value="__new__">+ Yeni kulüp oluştur</option>
        </NativeSelect>
      </div>

      {isNew && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newName">Kulüp adı</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Örn. Ordu Oryantiring Kulübü"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newCode">Kod (opsiyonel)</Label>
            <Input
              id="newCode"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Örn. ORD"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function UserCard({ u }: { u: AdminUser }) {
  const approve = useApproveUser();
  const reject = useRejectUser();
  const assign = useAssignClub();

  const [panel, setPanel] = useState<null | "approve" | "assign">(null);
  const [asManager, setAsManager] = useState(false);
  const [clubId, setClubId] = useState("");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const status = STATUS_META[u.status];

  function resetPanel() {
    setPanel(null);
    setAsManager(false);
    setClubId("");
    setNewName("");
    setNewCode("");
    setError(null);
  }

  async function onApprove() {
    setError(null);
    const input: ApproveInput = {};
    if (asManager) {
      input.is_club_manager = true;
      if (clubId === "__new__") {
        if (newName.trim() === "") {
          setError("Yeni kulüp için ad girin.");
          return;
        }
        input.club_name = newName.trim();
        if (newCode.trim()) input.club_code = newCode.trim();
      } else if (clubId !== "") {
        input.club_id = Number(clubId);
      } else {
        setError("Kulüp seçin veya yeni kulüp oluşturun.");
        return;
      }
    }
    try {
      await approve.mutateAsync({ id: u.id, input });
      resetPanel();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Onaylanamadı.");
    }
  }

  async function onAssign() {
    setError(null);
    if (clubId === "" || clubId === "__new__") {
      setError("Var olan bir kulüp seçin.");
      return;
    }
    try {
      await assign.mutateAsync({ id: u.id, club_id: Number(clubId) });
      resetPanel();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Atanamadı.");
    }
  }

  async function onReject() {
    if (!window.confirm(`${u.full_name} adlı başvuru reddedilsin mi?`)) return;
    try {
      await reject.mutateAsync(u.id);
    } catch {
      /* liste invalidate edilir; hata durumunda satır aynı kalır */
    }
  }

  const busy = approve.isPending || reject.isPending || assign.isPending;
  const canAssignClub = u.status === "active" && !u.is_admin && !u.club;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-snug">{u.full_name}</h3>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" /> {u.email}
            </span>
            {u.phone_number && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> {u.phone_number}
              </span>
            )}
            {u.club && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-3.5" /> {u.club.name} ({u.club.code})
              </span>
            )}
          </div>
        </div>
        {u.created_at && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDateTR(u.created_at)}
          </span>
        )}
      </div>

      <RoleBadges u={u} />

      {/* Aksiyonlar */}
      {u.status === "pending" && panel === null && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button size="sm" onClick={() => setPanel("approve")} disabled={busy}>
            <Check /> Onayla
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={busy}
          >
            <X /> Reddet
          </Button>
        </div>
      )}

      {canAssignClub && panel === null && (
        <div className="border-t pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPanel("assign")}
            disabled={busy}
          >
            <Building2 /> Kulüp ata
          </Button>
        </div>
      )}

      {/* Onay paneli */}
      {panel === "approve" && (
        <div className="space-y-4 border-t pt-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={asManager}
              onChange={(e) => setAsManager(e.target.checked)}
            />
            Kulüp yöneticisi olarak onayla
          </label>

          {asManager && (
            <ClubPicker
              clubId={clubId}
              setClubId={setClubId}
              newName={newName}
              setNewName={setNewName}
              newCode={newCode}
              setNewCode={setNewCode}
            />
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={onApprove} disabled={busy}>
              <ShieldCheck /> {approve.isPending ? "Onaylanıyor…" : "Onayı Tamamla"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetPanel}
              disabled={busy}
            >
              Vazgeç
            </Button>
          </div>
        </div>
      )}

      {/* Kulüp atama paneli */}
      {panel === "assign" && (
        <div className="space-y-4 border-t pt-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <ClubPicker
            clubId={clubId}
            setClubId={setClubId}
            newName={newName}
            setNewName={setNewName}
            newCode={newCode}
            setNewCode={setNewCode}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onAssign} disabled={busy}>
              <Building2 /> {assign.isPending ? "Atanıyor…" : "Kulübe Ata"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetPanel} disabled={busy}>
              Vazgeç
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Users() {
  const [filter, setFilter] = useState<Filter>("pending");
  const { data, isLoading, isError } = useAdminUsers(filter);

  return (
    <div>
      <PageHeader
        title="Kullanıcılar"
        description="Öz-kayıt başvurularını onaylayın/reddedin ve kulüp yöneticisi atayın."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Kullanıcılar yüklenemedi" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={
            filter === "pending"
              ? "Bekleyen başvuru yok"
              : "Kullanıcı bulunamadı"
          }
          icon={UsersIcon}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((u) => (
            <UserCard key={u.id} u={u} />
          ))}
        </div>
      )}
    </div>
  );
}
