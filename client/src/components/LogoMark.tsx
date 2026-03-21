export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo-g.png" className="w-8 h-8" alt="GigLoop logo" />
      <span className="text-lg font-semibold tracking-tight text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]">
        GigLoop
      </span>
    </div>
  );
}