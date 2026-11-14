import React, { useState, useEffect, useRef } from 'react';

interface NumberInputProps {
  label: string;
  labelColor?: string;
  value: number;
  step?: number;
  precision?: number;
  onChange: (newValue: number, commit?: boolean) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  labelColor = 'var(--text-muted)',
  value,
  step = 0.1,
  precision = 2,
  onChange,
  onScrubStart,
  onScrubEnd
}) => {
  const [textValue, setTextValue] = useState(value.toFixed(precision));
  const [isFocused, setIsFocused] = useState(false);
  const isScrubbingRef = useRef(false);
  const startXRef = useRef(0);
  const startValRef = useRef(0);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(Number(value.toFixed(precision)).toString());
    }
  }, [value, precision, isFocused]);

  const handleLabelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isScrubbingRef.current = true;
    startXRef.current = e.clientX;
    startValRef.current = value;
    onScrubStart?.();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isScrubbingRef.current) return;
      const dx = moveEvent.clientX - startXRef.current;
      let sensitivity = step * 0.5;
      if (moveEvent.shiftKey) sensitivity *= 5;
      else if (moveEvent.altKey) sensitivity *= 0.1;

      const next = parseFloat((startValRef.current + dx * sensitivity).toFixed(precision));
      onChange(next, false);
    };

    const handleMouseUp = () => {
      if (isScrubbingRef.current) {
        isScrubbingRef.current = false;
        onScrubEnd?.();
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const commitText = () => {
    const parsed = parseFloat(textValue);
    if (!isNaN(parsed)) {
      onChange(parsed, true);
      setTextValue(Number(parsed.toFixed(precision)).toString());
    } else {
      setTextValue(Number(value.toFixed(precision)).toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitText();
      e.currentTarget.blur();
      return;
    }

    if (e.key === 'Escape') {
      setTextValue(Number(value.toFixed(precision)).toString());
      e.currentTarget.blur();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let delta = step;
      if (e.shiftKey) delta *= 10;
      else if (e.altKey) delta *= 0.1;
      if (e.key === 'ArrowDown') delta = -delta;

      const current = parseFloat(textValue);
      const base = isNaN(current) ? value : current;
      const next = parseFloat((base + delta).toFixed(precision));
      setTextValue(next.toString());
      onChange(next, true);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-input)',
        border: isFocused ? '1px solid var(--border-focus)' : '1px solid var(--border-color)',
        borderRadius: '4px',
        overflow: 'hidden',
        flex: 1,
        minWidth: 0
      }}
    >
      <span
        onMouseDown={handleLabelMouseDown}
        title="Drag left/right to scrub value"
        style={{
          padding: '4px 6px',
          fontSize: '11px',
          fontWeight: 700,
          color: labelColor,
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRight: '1px solid var(--border-color)',
          cursor: 'ew-resize',
          userSelect: 'none'
        }}
      >
        {label}
      </span>

      <input
        type="text"
        value={textValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          commitText();
        }}
        onChange={(e) => setTextValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: '4px 6px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: 'var(--text-main)'
        }}
      />
    </div>
  );
};
