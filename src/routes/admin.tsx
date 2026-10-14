import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Loader2,
  LogOut,
  Play,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TextNoticesSection, TimetableModeCard } from "@/components/admin-extras";
import { schoolLogo } from "@/lib/branding";
import { supabase } from "@/integrations/supabase/client";
import { createAdminAccount } from "@/lib/admin-signup.functions";
import { DISPLAY_QUERY_KEY, fetchDisplayData } from "@/lib/display-data";
import { prepareImageForUpload } from "@/lib/image-utils";
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_BUCKET,
  KIND_LABEL,
  MAX_SLIDE_SECONDS,
  MIN_SLIDE_SECONDS,
  clampSlideSeconds,
  imagesOfKind,
  titleFromFilename,
  validateImageFile,
  type DisplayImage,
  type ImageKind,
  type Variant,
} from "@/lib/notice-board";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Gurukul Digital Notice Board" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const SLIDE_SECOND_CHOICES = [5, 10, 15, 20, 30, 45, 60];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error)
    return String((error as { message: unknown }).message);
  return "Something went wrong. Please try again.";
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <main className="notice-board min-h-screen bg-background text-foreground">
      <Toaster position="top-center" />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-board-line pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src={schoolLogo}
              alt="Shree Swaminarayan Gurukul logo"
              className="size-14 shrink-0 object-contain sm:size-16"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-board-gold sm:text-xs">
                Gurukul Digital Notice Board
              </p>
              <h1 className="font-display text-xl font-semibold text-board-maroon sm:text-2xl">
                Display administration
              </h1>
            </div>
          </div>
          {right}
        </header>
        {children}
      </div>
    </main>
  );
}

function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <Shell>
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </Shell>
    );
  }
  if (!session) return <SignIn />;
  return <Dashboard session={session} />;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (creating) {
        // Server checks the registration code and creates the account already
        // confirmed, so no email verification code is needed.
        await createAdminAccount({ data: { email: email.trim(), password, code } });
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} className="board-panel mx-auto mt-10 max-w-md space-y-5 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">
            {creating ? "Create administrator account" : "Administrator sign in"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only the school's approved administrator email can change the display.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={creating ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {creating && (
          <div className="space-y-2">
            <Label htmlFor="code">Registration code</Label>
            <Input
              id="code"
              autoComplete="off"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {creating ? "Create account" : "Sign in"}
        </Button>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="w-full text-center text-sm text-board-maroon underline-offset-4 hover:underline"
        >
          {creating ? "I already have an account" : "First time? Create the administrator account"}
        </button>
      </form>
    </Shell>
  );
}

function Dashboard({ session }: { session: Session }) {
  const queryClient = useQueryClient();

  const adminCheck = useQuery({
    queryKey: ["is-display-admin", session.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_display_admin");
      if (error) throw error;
      return Boolean(data);
    },
  });

  const display = useQuery({
    queryKey: DISPLAY_QUERY_KEY,
    queryFn: fetchDisplayData,
    enabled: adminCheck.data === true,
  });

  const signOut = (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">{session.user.email}</span>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-board-line bg-card text-board-maroon"
      >
        <Link to="/display" target="_blank">
          <ExternalLink /> View display
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="border-board-line bg-card text-board-maroon"
        onClick={() => {
          queryClient.clear();
          void supabase.auth.signOut();
        }}
      >
        <LogOut /> Sign out
      </Button>
    </div>
  );

  if (adminCheck.isLoading) {
    return (
      <Shell right={signOut}>
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </Shell>
    );
  }
  if (adminCheck.isError) {
    return (
      <Shell right={signOut}>
        <p className="board-panel mt-8 p-6 text-sm text-destructive">
          Could not check administrator access: {errorMessage(adminCheck.error)}. Make sure the
          database setup (migration) has been applied.
        </p>
      </Shell>
    );
  }
  if (!adminCheck.data) {
    return (
      <Shell right={signOut}>
        <div className="board-panel mt-8 p-6">
          <h2 className="text-lg font-semibold">This account is not an administrator</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {session.user.email} is not on the approved administrator list. Sign out and use the
            school administrator email.
          </p>
        </div>
      </Shell>
    );
  }

  const images = display.data?.images ?? [];
  const notices = display.data?.notices ?? [];
  const settings = display.data?.settings;
  const hasSpecialContent =
    imagesOfKind(images, "timetable", "special").length > 0 ||
    notices.some((n) => n.kind === "timetable" && n.variant === "special");

  return (
    <Shell right={signOut}>
      {display.isError && (
        <p className="mt-6 text-sm text-destructive">
          Could not load the display data: {errorMessage(display.error)}
        </p>
      )}
      <div className="mt-6 space-y-6">
        <SlideshowCard
          enabled={settings?.slideshow_enabled ?? false}
          seconds={settings?.slide_seconds ?? 10}
          imageCount={images.length + notices.length}
          loading={display.isLoading}
        />
        <TimetableModeCard
          settings={settings}
          hasSpecialContent={hasSpecialContent}
          loading={display.isLoading}
        />
        <TextNoticesSection notices={notices} />
        <ImageSection
          kind="datesheet"
          variant="default"
          heading="Date sheet images"
          images={imagesOfKind(images, "datesheet")}
        />
        <ImageSection
          kind="timetable"
          variant="default"
          heading="Default timetable images"
          images={imagesOfKind(images, "timetable", "default")}
        />
        <ImageSection
          kind="timetable"
          variant="special"
          heading="Special occasion timetable images"
          images={imagesOfKind(images, "timetable", "special")}
        />
      </div>
    </Shell>
  );
}

function SlideshowCard({
  enabled,
  seconds,
  imageCount,
  loading,
}: {
  enabled: boolean;
  seconds: number;
  imageCount: number;
  loading: boolean;
}) {
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: async (patch: { slideshow_enabled?: boolean; slide_seconds?: number }) => {
      const { data, error } = await supabase
        .from("display_settings")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", 1)
        .select();
      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error(
          "The display settings could not be saved (no permission, or the settings row is missing).",
        );
    },
    onSuccess: (_data, patch) => {
      void queryClient.invalidateQueries({ queryKey: DISPLAY_QUERY_KEY });
      if (patch.slideshow_enabled !== undefined)
        toast.success(
          patch.slideshow_enabled ? "Slideshow started on the display." : "Slideshow stopped.",
        );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const noImages = imageCount === 0;

  return (
    <section className="board-panel p-5 sm:p-6" aria-labelledby="slideshow-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 id="slideshow-heading" className="text-lg font-semibold">
            Slideshow
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={`inline-block size-2.5 rounded-full ${enabled ? "bg-green-600" : "bg-board-line"}`}
              aria-hidden="true"
            />
            {enabled
              ? "Running: the display is showing all images and text entries as a slideshow."
              : "Off: the display shows the normal notice board."}
          </p>
        </div>
        <Button
          size="lg"
          variant={enabled ? "outline" : "default"}
          className={enabled ? "border-board-maroon text-board-maroon" : ""}
          disabled={loading || update.isPending || (!enabled && noImages)}
          onClick={() => update.mutate({ slideshow_enabled: !enabled })}
        >
          {update.isPending ? (
            <Loader2 className="animate-spin" />
          ) : enabled ? (
            <Square />
          ) : (
            <Play />
          )}
          {enabled ? "Stop slideshow" : "Start slideshow"}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-board-line pt-4">
        <Label htmlFor="slide-seconds" className="text-sm">
          Show each image for
        </Label>
        <select
          id="slide-seconds"
          value={clampSlideSeconds(seconds)}
          disabled={loading || update.isPending}
          onChange={(e) =>
            update.mutate({ slide_seconds: clampSlideSeconds(Number(e.target.value)) })
          }
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
        >
          {[...new Set([...SLIDE_SECOND_CHOICES, clampSlideSeconds(seconds)])]
            .sort((a, b) => a - b)
            .map((s) => (
              <option key={s} value={s}>
                {s} seconds
              </option>
            ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Between {MIN_SLIDE_SECONDS} and {MAX_SLIDE_SECONDS} seconds. The display refreshes by
          itself within about 30 seconds.
        </span>
      </div>
      {!enabled && noImages && !loading && (
        <p className="mt-3 text-sm text-muted-foreground">
          Add at least one image or text entry to start the slideshow.
        </p>
      )}
    </section>
  );
}

function ImageSection({
  kind,
  variant,
  heading,
  images,
}: {
  kind: ImageKind;
  variant: Variant;
  heading: string;
  images: DisplayImage[];
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<DisplayImage | null>(null);
  const label = KIND_LABEL[kind];
  const refresh = () => queryClient.invalidateQueries({ queryKey: DISPLAY_QUERY_KEY });

  async function onFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    setUploading(true);
    let nextOrder = images.reduce((max, image) => Math.max(max, image.sort_order), 0);
    let added = 0;
    for (const file of files) {
      const problem = validateImageFile(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      try {
        const prepared = await prepareImageForUpload(file);
        const path = `${kind}/${variant}/${crypto.randomUUID()}.${prepared.ext}`;
        const { error: uploadError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, prepared.blob, {
            contentType: prepared.type,
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        nextOrder += 1;
        const { error: insertError } = await supabase.from("display_images").insert({
          kind,
          variant,
          title: titleFromFilename(file.name),
          image_path: path,
          sort_order: nextOrder,
        });
        if (insertError) {
          await supabase.storage.from(IMAGE_BUCKET).remove([path]);
          throw insertError;
        }
        added += 1;
      } catch (error) {
        toast.error(`${file.name}: ${errorMessage(error)}`);
      }
    }
    setUploading(false);
    if (added > 0) {
      toast.success(`${added} ${label.toLowerCase()} image${added === 1 ? "" : "s"} added.`);
      await refresh();
    }
  }

  const remove = useMutation({
    mutationFn: async (image: DisplayImage) => {
      const { data, error } = await supabase
        .from("display_images")
        .delete()
        .eq("id", image.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("The image could not be deleted.");
      await supabase.storage.from(IMAGE_BUCKET).remove([image.image_path]);
    },
    onSuccess: () => {
      toast.success("Image deleted.");
      void refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const move = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const a = images[index];
      const b = images[index + direction];
      if (!a || !b) return;
      // Give the pair distinct, swapped positions even if they were equal before.
      const first = Math.min(a.sort_order, b.sort_order);
      const second = first + 1;
      const aNew = direction === -1 ? first : second;
      const bNew = direction === -1 ? second : first;
      const results = await Promise.all([
        supabase.from("display_images").update({ sort_order: aNew }).eq("id", a.id),
        supabase.from("display_images").update({ sort_order: bNew }).eq("id", b.id),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => void refresh(),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const inputId = `upload-${kind}-${variant}`;
  const sectionId = `${kind}-${variant}-heading`;

  return (
    <section className="board-panel p-5 sm:p-6" aria-labelledby={sectionId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={sectionId} className="text-lg font-semibold">
            {heading}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {images.length === 0
              ? "No image uploaded yet."
              : `${images.length} image${images.length === 1 ? "" : "s"} shown on the display, in this order.`}
          </p>
        </div>
        <div>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            className="sr-only"
            onChange={(e) => void onFiles(e.target.files)}
          />
          <Button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {uploading ? "Uploading…" : "Add image"}
          </Button>
        </div>
      </div>

      {images.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li
              key={image.id}
              className="overflow-hidden rounded-md border border-board-line bg-card"
            >
              <a href={image.url} target="_blank" rel="noreferrer" className="block bg-board-soft">
                <img
                  src={image.url}
                  alt={image.title || label}
                  loading="lazy"
                  className="h-44 w-full object-contain"
                />
              </a>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="min-w-0 truncate text-sm font-medium" title={image.title}>
                  {image.title || `${label} ${index + 1}`}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Move earlier"
                    disabled={index === 0 || move.isPending}
                    onClick={() => move.mutate({ index, direction: -1 })}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Move later"
                    disabled={index === images.length - 1 || move.isPending}
                    onClick={() => move.mutate({ index, direction: 1 })}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={`Delete ${image.title || label}`}
                    onClick={() => setToDelete(image)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the display and the slideshow. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove.mutate(toDelete);
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
