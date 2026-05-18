# Activities + Contact Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an activities module (log calls, meetings, visits, notes) and a chronological contact timeline that merges activities, tasks, conversations, and opportunities in one view.

**Architecture:** New `Activity` Prisma model (with `ActivityType` enum) links to `Contact` + `User`. A new `GET /api/contacts/[id]/timeline` endpoint aggregates all four entity types sorted by date. The contact profile page gains a timeline section (Client Component that fetches the endpoint) and an "Registrar atividade" button (dialog form). No new pages — everything lives on the existing contact profile.

**Tech Stack:** Next.js 16 App Router, Prisma 7, React Query (already installed), Zod, shadcn/ui Dialog

---

## IMPORTANT: Read before touching any file

- AGENTS.md says: **"Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."**
- All imports use `@/` alias.
- Prisma client: `import { prisma } from "@/lib/db/client"` — never `new PrismaClient()`.
- After modifying `prisma/schema.prisma`, always run the migration SQL manually AND `npx prisma generate` to regenerate the client.
- API route params in Next.js 16: `{ params }: { params: Promise<{ id: string }> }` — must `await params`.
- `getSession()` from `@/lib/auth/get-session` — returns `SessionUser | null`.
- `can(role, action, resource)` from `@/lib/auth/permissions`.
- The Dialog component is at `@/components/ui/dialog` (already installed).

---

## File Map

| Action | Path |
|--------|------|
| Modify | `prisma/schema.prisma` — add `ActivityType` enum + `Activity` model + relations |
| Create | `prisma/migrations/20260510000001_add_activities/migration.sql` |
| Create | `app/api/activities/route.ts` — POST create |
| Create | `app/api/activities/[id]/route.ts` — PATCH update, DELETE |
| Create | `app/api/contacts/[id]/timeline/route.ts` — GET aggregated timeline |
| Create | `components/activity-log-form.tsx` — dialog form (Client Component) |
| Create | `components/contact-timeline.tsx` — timeline list (Client Component) |
| Modify | `app/(dashboard)/contacts/[id]/page.tsx` — add timeline + log activity button |

---

## Task 1: Add Activity model to Prisma schema and run migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260510000001_add_activities/migration.sql`

- [ ] **Step 1: Add `ActivityType` enum to `prisma/schema.prisma`**

Open `prisma/schema.prisma`. Find the last enum block — it ends with:
```prisma
enum TenantStatus {
  active
  suspended
  cancelled
}
```

Add directly after it (before the `// ─── Tenant` section):
```prisma
enum ActivityType {
  call
  meeting
  visit
  email
  note
  other
}
```

- [ ] **Step 2: Add `Activity` model to `prisma/schema.prisma`**

Find the end of the file (after the `Message` model). Add this model at the very end:

```prisma
// ─── Activity ────────────────────────────────────────────────────────────────

model Activity {
  id         String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId   String       @map("tenant_id") @db.Uuid
  contactId  String       @map("contact_id") @db.Uuid
  userId     String       @map("user_id") @db.Uuid
  type       ActivityType
  title      String
  notes      String?
  occurredAt DateTime     @map("occurred_at")
  createdAt  DateTime     @default(now()) @map("created_at")

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  contact Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@index([tenantId, contactId])
  @@map("activities")
}
```

- [ ] **Step 3: Add `activities` relations to `Tenant`, `Contact`, and `User` models**

In the `Tenant` model, find the last relation line before `@@map("tenants")`. Add:
```prisma
  activities           Activity[]
```

In the `Contact` model, find `tasks Task[]` and `conversations Conversation[]`. Add after them:
```prisma
  activities    Activity[]
```

In the `User` model, find `assignedConversations Conversation[] @relation("ConversationAssignee")`. Add after it:
```prisma
  activities    Activity[]
```

- [ ] **Step 4: Create the migration SQL file**

Create directory and file:
```bash
mkdir -p /mnt/hd/CRM-PLUS/prisma/migrations/20260510000001_add_activities
```

Create file `prisma/migrations/20260510000001_add_activities/migration.sql` with this content:

```sql
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('call', 'meeting', 'visit', 'email', 'note', 'other');

-- CreateTable
CREATE TABLE "activities" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"   UUID         NOT NULL,
    "contact_id"  UUID         NOT NULL,
    "user_id"     UUID         NOT NULL,
    "type"        "ActivityType" NOT NULL,
    "title"       TEXT         NOT NULL,
    "notes"       TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_tenant_id_contact_id_idx" ON "activities"("tenant_id", "contact_id");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 5: Apply migration to the local database**

```bash
cd /mnt/hd/CRM-PLUS
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  npx prisma migrate deploy
```

Expected output includes: `1 migration applied` or `Applying migration 20260510000001_add_activities`.

If you get "migration already applied" errors, use `prisma db push` instead:
```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  npx prisma db push
```

- [ ] **Step 6: Regenerate Prisma client**

```bash
cd /mnt/hd/CRM-PLUS
npx prisma generate
```

Expected: `Generated Prisma Client` message. The `Activity` type should now be available in `@/lib/generated/prisma`.

- [ ] **Step 7: Verify TypeScript sees the new model**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors. If you see "Property 'activity' does not exist on type 'PrismaClient'", the generate step failed — re-run `npx prisma generate`.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260510000001_add_activities/
git commit -m "feat: add Activity model and migration"
```

---

## Task 2: Create activities API endpoints

**Files:**
- Create: `app/api/activities/route.ts`
- Create: `app/api/activities/[id]/route.ts`

- [ ] **Step 1: Test that endpoints return 404 before implementation**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" -d '{}'
```

Expected: `404`

- [ ] **Step 2: Create `app/api/activities/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";

const schema = z.object({
  contactId:  z.string().uuid(),
  type:       z.enum(["call", "meeting", "visit", "email", "note", "other"]),
  title:      z.string().min(1).max(255),
  notes:      z.string().max(2000).optional(),
  occurredAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "create", "contacts")) return forbidden();

  const body   = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { contactId, type, title, notes, occurredAt } = parsed.data;

  const contact = await prisma.contact.findFirst({
    where:  { id: contactId, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 });
  }

  const activity = await prisma.activity.create({
    data: {
      tenantId:   session.tenantId,
      contactId,
      userId:     session.id,
      type,
      title,
      notes,
      occurredAt: new Date(occurredAt),
    },
    select: {
      id:         true,
      type:       true,
      title:      true,
      notes:      true,
      occurredAt: true,
      createdAt:  true,
      user:       { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
```

- [ ] **Step 3: Create `app/api/activities/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";

const patchSchema = z.object({
  type:       z.enum(["call", "meeting", "visit", "email", "note", "other"]).optional(),
  title:      z.string().min(1).max(255).optional(),
  notes:      z.string().max(2000).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "contacts")) return forbidden();

  const { id }   = await params;
  const body     = await req.json().catch(() => null);
  const parsed   = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.activity.findFirst({
    where:  { id, tenantId: session.tenantId },
    select: { id: true, userId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Atividade não encontrada." }, { status: 404 });
  }
  if (existing.userId !== session.id && !can(session.role, "admin", "contacts")) {
    return forbidden();
  }

  const data    = parsed.data;
  const updated = await prisma.activity.update({
    where: { id },
    data: {
      ...(data.type       !== undefined && { type: data.type }),
      ...(data.title      !== undefined && { title: data.title }),
      ...(data.notes      !== undefined && { notes: data.notes }),
      ...(data.occurredAt !== undefined && { occurredAt: new Date(data.occurredAt) }),
    },
    select: { id: true, type: true, title: true, notes: true, occurredAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "delete", "contacts")) return forbidden();

  const { id } = await params;

  const existing = await prisma.activity.findFirst({
    where:  { id, tenantId: session.tenantId },
    select: { id: true, userId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Atividade não encontrada." }, { status: 404 });
  }
  if (existing.userId !== session.id && !can(session.role, "admin", "contacts")) {
    return forbidden();
  }

  await prisma.activity.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Test POST endpoint (need to be logged in — use cookie from browser)**

The easiest way to test authenticated endpoints is to copy your session cookie from the browser's DevTools after logging in. With `admin@acme.com.br`:

1. Log in at http://localhost:3000/login
2. Open DevTools → Application → Cookies → copy the `authjs.session-token` value
3. Get a real contactId from Prisma Studio or `/api/contacts` endpoint

```bash
# Replace SESSION_TOKEN and CONTACT_ID with real values
curl -s -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=SESSION_TOKEN" \
  -d '{
    "contactId": "CONTACT_ID",
    "type": "call",
    "title": "Ligação de apresentação",
    "notes": "Cliente demonstrou interesse no plano Pro.",
    "occurredAt": "2026-05-10T10:00:00.000Z"
  }' | jq .
```

Expected: 201 with activity object including `id`, `type`, `title`, `user`.

- [ ] **Step 6: Commit**

```bash
git add app/api/activities/
git commit -m "feat: add activities API (POST, PATCH, DELETE)"
```

---

## Task 3: Create contact timeline API endpoint

**Files:**
- Create: `app/api/contacts/[id]/timeline/route.ts`

This endpoint aggregates activities, tasks, conversations, and opportunities for a contact, sorted by date descending. Returns an array of `TimelineItem` objects.

- [ ] **Step 1: Create `app/api/contacts/[id]/timeline/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";

export interface TimelineItem {
  id:       string;
  type:     "activity" | "task" | "conversation" | "opportunity";
  date:     string;  // ISO 8601
  title:    string;
  subtitle: string;
  badge:    string;
  extra?:   string;  // e.g. formatted currency value
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "contacts")) return forbidden();

  const { id: contactId } = await params;

  const contact = await prisma.contact.findFirst({
    where:  { id: contactId, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 });
  }

  const [activities, tasks, conversations, opportunities] = await Promise.all([
    prisma.activity.findMany({
      where:   { contactId, tenantId: session.tenantId },
      orderBy: { occurredAt: "desc" },
      take:    100,
      select: {
        id:         true,
        type:       true,
        title:      true,
        notes:      true,
        occurredAt: true,
        user:       { select: { name: true } },
      },
    }),

    prisma.task.findMany({
      where:   { contactId, tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take:    50,
      select:  { id: true, title: true, status: true, priority: true, dueAt: true, createdAt: true },
    }),

    prisma.conversation.findMany({
      where:   { contactId, tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take:    50,
      select: {
        id:        true,
        channel:   true,
        status:    true,
        createdAt: true,
        _count:    { select: { messages: true } },
      },
    }),

    prisma.opportunity.findMany({
      where:   { contactId, tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take:    50,
      select: {
        id:        true,
        title:     true,
        status:    true,
        value:     true,
        createdAt: true,
        stage:     { select: { name: true } },
      },
    }),
  ]);

  const ACTIVITY_LABELS: Record<string, string> = {
    call: "Ligação", meeting: "Reunião", visit: "Visita",
    email: "E-mail", note: "Nota", other: "Atividade",
  };

  const items: TimelineItem[] = [
    ...activities.map((a) => ({
      id:       a.id,
      type:     "activity" as const,
      date:     a.occurredAt.toISOString(),
      title:    a.title,
      subtitle: `${ACTIVITY_LABELS[a.type] ?? a.type} · ${a.user.name}`,
      badge:    a.type,
      extra:    a.notes ?? undefined,
    })),

    ...tasks.map((t) => ({
      id:       t.id,
      type:     "task" as const,
      date:     (t.dueAt ?? t.createdAt).toISOString(),
      title:    t.title,
      subtitle: `Tarefa · ${t.priority}`,
      badge:    t.status,
    })),

    ...conversations.map((c) => ({
      id:       c.id,
      type:     "conversation" as const,
      date:     c.createdAt.toISOString(),
      title:    `Conversa via ${c.channel}`,
      subtitle: `${c._count.messages} mensagens`,
      badge:    c.status,
    })),

    ...opportunities.map((o) => ({
      id:       o.id,
      type:     "opportunity" as const,
      date:     o.createdAt.toISOString(),
      title:    o.title,
      subtitle: o.stage.name,
      badge:    o.status,
      extra:    o.value
        ? Number(o.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
        : undefined,
    })),
  ];

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(items);
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Test the endpoint**

```bash
# Replace SESSION_TOKEN and CONTACT_ID with real values from browser/Prisma Studio
curl -s http://localhost:3000/api/contacts/CONTACT_ID/timeline \
  -H "Cookie: authjs.session-token=SESSION_TOKEN" | jq '.[0:3]'
```

Expected: JSON array of timeline items, sorted by `date` descending (most recent first).

- [ ] **Step 4: Commit**

```bash
git add app/api/contacts/[id]/timeline/
git commit -m "feat: add contact timeline API — aggregates activities, tasks, conversations, opportunities"
```

---

## Task 4: Create ActivityLogForm component

**Files:**
- Create: `components/activity-log-form.tsx`

This is a Client Component: a button that opens a Dialog with a form. On submit, it calls `POST /api/activities` and calls `onSuccess()` so the parent can refresh the timeline.

- [ ] **Step 1: Create `components/activity-log-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  contactId: string;
  onSuccess: () => void;
}

const TYPES = [
  { value: "call",    label: "Ligação" },
  { value: "meeting", label: "Reunião" },
  { value: "visit",   label: "Visita" },
  { value: "email",   label: "E-mail" },
  { value: "note",    label: "Nota" },
  { value: "other",   label: "Outro" },
] as const;

export function ActivityLogForm({ contactId, onSuccess }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [type, setType]       = useState("call");

  // Default to today at noon in local time (ISO 8601 for datetime-local input)
  const todayLocal = new Date();
  todayLocal.setHours(12, 0, 0, 0);
  const defaultDate = todayLocal.toISOString().slice(0, 16);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd         = new FormData(e.currentTarget);
    const title      = fd.get("title") as string;
    const notes      = fd.get("notes") as string;
    const occurredAt = new Date(fd.get("occurredAt") as string).toISOString();

    try {
      const res = await fetch("/api/activities", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ contactId, type, title, notes: notes || undefined, occurredAt }),
      });

      if (res.ok) {
        setOpen(false);
        setType("call");
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) ?? "Erro ao salvar atividade.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Registrar atividade
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar atividade</DialogTitle>
          <DialogDescription>
            Registre uma interação com este contato.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="act-title">Título</Label>
            <Input
              id="act-title"
              name="title"
              placeholder="Ex: Ligação de prospecção"
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="act-date">Data e hora</Label>
            <Input
              id="act-date"
              name="occurredAt"
              type="datetime-local"
              defaultValue={defaultDate}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="act-notes">Notas (opcional)</Label>
            <Textarea
              id="act-notes"
              name="notes"
              placeholder="Resumo da conversa, próximos passos..."
              rows={3}
              maxLength={2000}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If `Textarea` is missing from `@/components/ui/`, check if it exists:
```bash
ls /mnt/hd/CRM-PLUS/components/ui/ | grep textarea
```

If absent, create it:
```bash
npx shadcn@latest add textarea
```

- [ ] **Step 3: Commit**

```bash
git add components/activity-log-form.tsx
git commit -m "feat: add ActivityLogForm dialog component"
```

---

## Task 5: Create ContactTimeline component

**Files:**
- Create: `components/contact-timeline.tsx`

This is a Client Component that:
1. Fetches `GET /api/contacts/[id]/timeline` on mount
2. Shows a loading skeleton while fetching
3. Renders items in chronological order (most recent first) with icons per type
4. Exposes a `refresh()` imperative handle via `useImperativeHandle` — not needed here; instead the parent passes a `refreshKey` prop that triggers a re-fetch when incremented

- [ ] **Step 1: Create `components/contact-timeline.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  Users,
  MapPin,
  Mail,
  FileText,
  Activity,
  CheckSquare,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TimelineItem {
  id:       string;
  type:     "activity" | "task" | "conversation" | "opportunity";
  date:     string;
  title:    string;
  subtitle: string;
  badge:    string;
  extra?:   string;
}

interface Props {
  contactId:  string;
  refreshKey: number; // increment to trigger re-fetch
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call:     <Phone className="h-3.5 w-3.5" />,
  meeting:  <Users className="h-3.5 w-3.5" />,
  visit:    <MapPin className="h-3.5 w-3.5" />,
  email:    <Mail className="h-3.5 w-3.5" />,
  note:     <FileText className="h-3.5 w-3.5" />,
  other:    <Activity className="h-3.5 w-3.5" />,
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  activity:     <Activity className="h-3.5 w-3.5 text-blue-500" />,
  task:         <CheckSquare className="h-3.5 w-3.5 text-amber-500" />,
  conversation: <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
  opportunity:  <TrendingUp className="h-3.5 w-3.5 text-violet-500" />,
};

const BADGE_COLORS: Record<string, string> = {
  // activity types
  call: "bg-blue-100 text-blue-700",
  meeting: "bg-indigo-100 text-indigo-700",
  visit: "bg-cyan-100 text-cyan-700",
  email: "bg-sky-100 text-sky-700",
  note: "bg-gray-100 text-gray-700",
  other: "bg-slate-100 text-slate-700",
  // task statuses
  pending: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  // conversation statuses
  open: "bg-green-100 text-green-700",
  resolved: "bg-gray-100 text-gray-700",
  // opportunity statuses
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

const BADGE_LABELS: Record<string, string> = {
  call: "Ligação", meeting: "Reunião", visit: "Visita",
  email: "E-mail", note: "Nota", other: "Outro",
  pending: "Pendente", done: "Concluída", cancelled: "Cancelada",
  open: "Aberta", resolved: "Resolvida",
  won: "Ganha", lost: "Perdida",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ContactTimeline({ contactId, refreshKey }: Props) {
  const [items, setItems]     = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`/api/contacts/${contactId}/timeline`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TimelineItem[]>;
      })
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar linha do tempo.");
        setLoading(false);
      });
  }, [contactId, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-4 text-center">{error}</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhum registro encontrado. Registre uma atividade para começar.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {items.map((item, idx) => (
        <div key={`${item.id}-${idx}`} className="relative flex gap-4 pb-4">
          {/* Icon bubble */}
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
            {item.type === "activity"
              ? ACTIVITY_ICONS[item.badge] ?? TYPE_ICONS.activity
              : TYPE_ICONS[item.type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGE_COLORS[item.badge] ?? "bg-muted text-muted-foreground"}`}
              >
                {BADGE_LABELS[item.badge] ?? item.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
            {item.extra && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">{item.extra}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">{fmt(item.date)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/contact-timeline.tsx
git commit -m "feat: add ContactTimeline component"
```

---

## Task 6: Update contact profile page

**Files:**
- Modify: `app/(dashboard)/contacts/[id]/page.tsx`

Current page structure: header → tags → AI summary card → 3-column grid (Oportunidades, Tarefas, Conversas).

Changes:
1. Add "Registrar atividade" button next to the contact name
2. Add "Linha do Tempo" section below the grid
3. Both new sections require Client Components — create a thin wrapper to manage the `refreshKey` state

Because the existing page is a Server Component and needs `refreshKey` state to coordinate between the form (trigger refresh) and the timeline (re-fetch), we need a small Client Component wrapper for just that state coordination.

- [ ] **Step 1: Create `app/(dashboard)/contacts/[id]/activity-section.tsx`**

This Client Component wraps `ActivityLogForm` + `ContactTimeline` and manages the `refreshKey`:

```tsx
"use client";

import { useState } from "react";
import { ActivityLogForm } from "@/components/activity-log-form";
import { ContactTimeline } from "@/components/contact-timeline";

interface Props { contactId: string }

export function ActivitySection({ contactId }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Linha do Tempo</h2>
        <ActivityLogForm
          contactId={contactId}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>
      <ContactTimeline contactId={contactId} refreshKey={refreshKey} />
    </div>
  );
}
```

- [ ] **Step 2: Import and add `ActivitySection` to the contact profile page**

Open `app/(dashboard)/contacts/[id]/page.tsx`.

Add the import at the top, after the existing imports:
```typescript
import { ActivitySection } from "./activity-section";
```

Find the closing of the 3-column grid (the `</div>` that closes `className="grid grid-cols-1 md:grid-cols-3 gap-4"`). The grid section ends around line 205 with:
```tsx
      </div>
    </div>
  );
}
```

Add the `ActivitySection` component between the closing grid `</div>` and the final closing `</div>`:

```tsx
      {/* Grid de info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ... existing cards ... */}
      </div>

      {/* Linha do Tempo */}
      <ActivitySection contactId={contact.id} />
    </div>
  );
}
```

To be precise: the last lines of the return statement currently look like this:

```tsx
        </Card>
      </div>
    </div>
  );
}
```

Replace the last two `</div>` lines with:

```tsx
        </Card>
      </div>

      {/* Linha do Tempo */}
      <ActivitySection contactId={contact.id} />
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Full end-to-end test in browser**

1. Navigate to http://localhost:3000/contacts
2. Click on any contact name (should link to `/contacts/[id]`)
3. Scroll to the bottom — should see "Linha do Tempo" section with a "Registrar atividade" button
4. Timeline should be empty initially (or show existing tasks/conversations/opportunities if the contact has them)
5. Click "Registrar atividade" → dialog opens
6. Select type "Ligação", enter title "Teste de ligação", pick today's date, add notes → click "Salvar"
7. Dialog closes, timeline refreshes and shows the new activity at the top
8. Verify the activity appears with the correct type badge and date

- [ ] **Step 5: Test with a contact that has existing data**

1. Find a contact with tasks and/or conversations in Prisma Studio
2. Open their profile — timeline should show mixed items (tasks, conversations, activities) sorted by date
3. Confirm ordering is most-recent first

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/contacts/[id]/"
git commit -m "feat: add timeline and activity logging to contact profile page"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Activity CRUD ✅, timeline aggregation (activities + tasks + conversations + opportunities) ✅, UI (log form + timeline view) ✅
- [x] **Placeholder scan:** no TBDs, all code complete
- [x] **Type consistency:** `TimelineItem` interface defined in API route and re-declared inline in component (acceptable since client code can't import server types directly in Next.js)
- [x] **Migration:** SQL creates enum + table + indexes + FKs exactly matching the Prisma schema
- [x] **Security:** all API routes check session + `can()` permissions; activity edit/delete restricted to owner or admin role
- [x] **Tenant isolation:** all queries filter by `tenantId`
- [x] **No prisma generate skip:** Task 1 Step 6 explicitly runs `npx prisma generate`
