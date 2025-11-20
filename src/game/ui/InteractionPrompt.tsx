import { Html } from '@react-three/drei';

interface InteractionPromptProps {
  visible: boolean;
  position: [number, number, number];
}

export function InteractionPrompt({ visible, position }: InteractionPromptProps) {
  if (!visible) return null;

  return (
    <Html position={position} center>
      <div
        style={{
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Press E
      </div>
    </Html>
  );
}

