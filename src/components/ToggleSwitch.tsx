import React, { useState, useCallback } from 'react';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  title?: string;
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, title }) => {
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = useCallback(() => setPressed(true), []);
  const handlePointerUp = useCallback(() => setPressed(false), []);
  const handleClick = useCallback(() => onChange(!checked), [checked, onChange]);

  // sizes (match previous sizing)
  const width = 84;
  const height = 36;
  const knobSize = 34;
  const knobTravel = width - knobSize - 4; // 2px padding each side

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      title={title}
      className={`relative inline-flex items-center rounded-full select-none`}
      style={{
        width,
        height,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        // ensure no default focus ring shows; keep accessible focus handling elsewhere if desired
      }}
    >
      <span
        className={`absolute inset-0 rounded-full ${checked ? 'bg-green-500' : 'bg-red-500'}`}
        style={{ transition: 'none' }}
      />

      {/* Text label */}
      <span
        className={`absolute left-3 font-semibold text-white text-sm transition-none ${checked ? 'opacity-100' : 'opacity-0'}`}
      >
        ON
      </span>
      <span
        className={`absolute right-3 font-semibold text-white text-sm transition-none ${checked ? 'opacity-0' : 'opacity-100'}`}
      >
        OFF
      </span>

      {/* Knob */}
      <span
        aria-hidden
        className={`absolute bg-white rounded-full shadow-lg`
        }
        style={{
          width: knobSize,
          height: knobSize,
          left: 2,
          transform: `translate(${checked ? knobTravel : 0}px, -50%) scale(${pressed ? 0.96 : 1})`,
          top: '50%',
          transition: 'none',
        }}
      />
    </button>
  );
};

export default ToggleSwitch;
