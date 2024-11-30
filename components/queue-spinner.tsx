"use client";

import React from "react";
import { motion } from "framer-motion";

interface QueueSpinnerProps {
  dotCount?: number;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export function QueueSpinner({
  dotCount = 8,
  size = "md",
  color = "bg-blue-500",
}: QueueSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const dotSize = {
    sm: "w-1 h-1",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  return (
    <div
      className={`relative ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: dotCount }).map((_, index) => {
        const angle = (index * 2 * Math.PI) / dotCount;
        const top = parseFloat((50 - 40 * Math.cos(angle)).toFixed(2));
        const left = parseFloat((50 + 40 * Math.sin(angle)).toFixed(2));

        return (
          <motion.div
            key={index}
            className={`absolute ${dotSize[size]} ${color} rounded-full`}
            animate={{
              rotate: [0, 360],
              opacity: [0.2, 1, 0.2],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              times: [0, 0.5, 1],
              delay: index * (1.5 / dotCount),
            }}
            style={{
              top: `${top}%`,
              left: `${left}%`,
            }}
          />
        );
      })}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
