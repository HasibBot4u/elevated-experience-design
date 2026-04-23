import { Construction } from "lucide-react";
import { NexusLogo } from "@/components/brand/NexusLogo";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <NexusLogo size="lg" href="" />
        <div className="my-10 inline-flex w-20 h-20 rounded-2xl bg-warning/10 border border-warning/30 items-center justify-center">
          <Construction className="w-9 h-9 text-warning" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-3">We'll be right back</h1>
        <p className="text-foreground-dim">NexusEdu is undergoing scheduled maintenance. Thank you for your patience.</p>
      </div>
    </div>
  );
}
