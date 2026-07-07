import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ClockColor = "dark" | "red" | "purple";

interface DigitProps {
  value: number;
  size?: "sm" | "md";
  color?: ClockColor;
}

const SIZE_CLASSES: Record<"sm" | "md", { box: string; text: string }> = {
  sm: { box: "w-10 h-14", text: "text-3xl" },
  md: { box: "w-10 h-14", text: "text-3xl" },
};

const COLOR_CLASSES: Record<ClockColor, { box: string; sep: string }> = {
  dark: { box: "bg-zinc-900 text-white", sep: "text-zinc-500" },
  red: { box: "bg-red-700 text-white", sep: "text-red-600" },
  // Roxo institucional do GrauOS (#7C3AED), mesma cor usada no cabeçalho dos
  // relatórios e nos botões de destaque do módulo Frota.
  purple: { box: "bg-purple-700 text-white", sep: "text-purple-600" },
};

const Digit = ({ value, size = "md", color = "dark" }: DigitProps) => {
  const { box, text } = SIZE_CLASSES[size];
  const { box: colorBox } = COLOR_CLASSES[color];
  return (
    <div
      className={`relative ${box} overflow-hidden rounded-md ${colorBox} font-mono ${text} font-bold flex items-center justify-center`}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

interface FlipClockProps {
  size?: "sm" | "md";
  color?: ClockColor;
  className?: string;
}

export default function FlipClock({ size = "md", color = "dark", className = "" }: FlipClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const sepClass = "text-3xl";
  const sepColor = COLOR_CLASSES[color].sep;

  return (
    <div className={`flex justify-center items-center gap-1 ${className}`}>
      {hours.split("").map((digit, i) => (
        <Digit key={`h-${i}`} value={parseInt(digit)} size={size} color={color} />
      ))}
      <span className={`font-bold ${sepColor} ${sepClass}`}>:</span>
      {minutes.split("").map((digit, i) => (
        <Digit key={`m-${i}`} value={parseInt(digit)} size={size} color={color} />
      ))}
      <span className={`font-bold ${sepColor} ${sepClass}`}>:</span>
      {seconds.split("").map((digit, i) => (
        <Digit key={`s-${i}`} value={parseInt(digit)} size={size} color={color} />
      ))}
    </div>
  );
}
