import { StickyNote } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="container max-w-3xl py-10">
      <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Personal</p>
      <h1 className="font-display text-4xl font-bold tracking-tighter mb-8">My notes</h1>
      <div className="rounded-2xl p-12 bg-background-elevated border border-border text-center">
        <StickyNote className="w-10 h-10 text-foreground-muted mx-auto mb-4" />
        <p className="text-foreground-dim">Notes feature coming in your next update — designed to live alongside the player.</p>
      </div>
    </div>
  );
}
