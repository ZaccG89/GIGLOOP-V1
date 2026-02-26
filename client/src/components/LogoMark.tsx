import logoUrl from "/giggity-logo.png";

type Props = {
  size?: number;
  className?: string;
};

export default function LogoMark({ size = 32, className = "" }: Props) {
  return (
    <img
      src={logoUrl}
      alt="Giggity"
      width={size}
      height={size}
      draggable={false}
      className={`object-contain select-none ${className}`}
    />
  );
}
