type Props = {
  className?: string;
  height?: string;
};

export default function LogoWordmark({ className = "", height = "h-9" }: Props) {
  return (
    <img
      src="/brand/giggity-wordmark-nav-72h.png"
      alt="Giggity"
      draggable={false}
      className={`${height} w-auto object-contain select-none ${className}`}
    />
  );
}
