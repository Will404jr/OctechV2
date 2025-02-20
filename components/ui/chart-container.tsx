import type React from "react";

interface ChartContainerProps {
  children: React.ReactNode;
  config: any;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  config,
}) => {
  return <div>{children}</div>;
};
