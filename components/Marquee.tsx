import React from "react";

interface MarqueeProps {
  text: string;
}

export function Marquee({ text }: MarqueeProps) {
  return (
    <div className="overflow-hidden bg-[#0e4480] text-white py-3 fixed bottom-0 left-0 right-0">
      <div className="animate-marquee whitespace-nowrap">
        <span className="mx-4 text-lg">{text}</span>
        {/* <span className="mx-4 text-lg">{text}</span>
        <span className="mx-4 text-lg">{text}</span>
        <span className="mx-4 text-lg">{text}</span> */}
      </div>
    </div>
  );
}
