import React, { useRef, useState } from "react";

import type { ReactNode } from "react";

interface ResizableThreeColumnsProps {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
  initialLeft?: number;
  initialMiddle?: number;
  minLeft?: number;
  minMiddle?: number;
  minRight?: number;
}

type DragTarget = "left" | "middle";

interface DragState {
  target: DragTarget;
  startX: number;
  startLeft: number;
  startMiddle: number;
}

export const ResizableThreeColumns: React.FC<ResizableThreeColumnsProps> = ({
  left,
  middle,
  right,
  initialLeft = 20,
  initialMiddle = 25,
  minLeft = 15,
  minMiddle = 20,
  minRight = 20,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeft);
  const [middleWidth, setMiddleWidth] = useState(initialMiddle);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const handleMouseMove = (event: MouseEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState || !containerRef.current) {
      return;
    }

    const containerWidth = containerRef.current.getBoundingClientRect().width;
    if (containerWidth <= 0) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaPercent = (deltaX / containerWidth) * 100;

    if (dragState.target === "left") {
      let nextLeft = dragState.startLeft + deltaPercent;
      const maxLeft = 100 - minRight - dragState.startMiddle;

      if (nextLeft < minLeft) {
        nextLeft = minLeft;
      }
      if (nextLeft > maxLeft) {
        nextLeft = maxLeft;
      }

      setLeftWidth(nextLeft);
    } else {
      let nextMiddle = dragState.startMiddle + deltaPercent;
      const maxMiddle = 100 - minRight - dragState.startLeft;

      if (nextMiddle < minMiddle) {
        nextMiddle = minMiddle;
      }
      if (nextMiddle > maxMiddle) {
        nextMiddle = maxMiddle;
      }

      setMiddleWidth(nextMiddle);
    }
  };

  const endDrag = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", endDrag);
    dragStateRef.current = null;
  };

  const startDrag =
    (target: DragTarget) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();

      dragStateRef.current = {
        target,
        startX: event.clientX,
        startLeft: leftWidth,
        startMiddle: middleWidth,
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", endDrag);
    };

  const rightWidth = 100 - leftWidth - middleWidth;

  return (
    <div ref={containerRef} className="h-full w-full flex overflow-hidden">
      <div className="h-full bg-muted/10" style={{ width: `${leftWidth}%` }}>
        {left}
      </div>

      <div
        className="group relative w-3 cursor-col-resize select-none"
        onMouseDown={startDrag("left")}
      >
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border transition-all group-hover:w-1 group-hover:bg-primary/40" />
      </div>

      <div
        className="h-full flex flex-col"
        style={{ width: `${middleWidth}%` }}
      >
        {middle}
      </div>

      <div
        className="group relative w-3 cursor-col-resize select-none"
        onMouseDown={startDrag("middle")}
      >
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border transition-all group-hover:w-1 group-hover:bg-primary/40" />
      </div>

      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ width: `${rightWidth}%` }}
      >
        {right}
      </div>
    </div>
  );
};
