type Props = {
  className?: string;
  height?: string;
};

export default function LogoWordmark({ className = "", height = "h-9" }: Props) {
  return (
    <img
      src="/brand/GigLoop-wordmark-nav-72h.png"
      alt="GigLoop"
      draggable={false}
      className={`${height} w-auto object-contain select-none ${className}`}
    />
  );
}
