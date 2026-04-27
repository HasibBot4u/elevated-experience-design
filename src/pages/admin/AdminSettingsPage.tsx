import { Link } from "react-router-dom";
import { ServerCog, ArrowRight } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-foreground-dim text-sm mt-1">সেটিংস এখন সিস্টেম পেজে স্থানান্তরিত।</p>
      </header>
      <Link to="/admin/system"
        className="flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-surface hover:border-primary/30 transition-all group">
        <div className="p-3 rounded-xl bg-primary/15 text-primary"><ServerCog className="w-5 h-5" /></div>
        <div className="flex-1">
          <p className="font-display font-semibold">সেটিংসের জন্য সিস্টেম পেজে যান</p>
          <p className="text-sm text-foreground-dim">Maintenance, branding, backend health সবকিছু এখানে।</p>
        </div>
        <ArrowRight className="w-5 h-5 text-foreground-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </Link>
    </div>
  );
}
