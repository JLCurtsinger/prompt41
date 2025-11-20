import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface EnemyHealthBarProps {
  health: number;
  maxHealth: number;
  getHealth?: () => number; // Optional getter function for reactive updates
}

/**
 * Simple 3D health bar that displays above an enemy
 * Uses two quads: background (red/dark) and foreground (green) that scales based on health
 */
export function EnemyHealthBar({ health, maxHealth, getHealth }: EnemyHealthBarProps) {
  const currentHealthRef = useRef(health);
  const foregroundRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // Update health from getter if provided (for reactive updates)
  useFrame(() => {
    if (getHealth) {
      currentHealthRef.current = getHealth();
    } else {
      currentHealthRef.current = health;
    }
    
    // Update health bar scale and color
    if (foregroundRef.current && maxHealth > 0) {
      const healthPercent = Math.max(0, Math.min(1, currentHealthRef.current / maxHealth));
      foregroundRef.current.scale.x = healthPercent;
      // Update position to keep left-aligned
      foregroundRef.current.position.x = -(0.4) * (1 - healthPercent);
      
      // Update color based on health
      if (materialRef.current) {
        if (healthPercent > 0.5) {
          materialRef.current.color.set("#00ff00");
          materialRef.current.emissive.set("#00aa00");
        } else if (healthPercent > 0.25) {
          materialRef.current.color.set("#ffff00");
          materialRef.current.emissive.set("#aa8800");
        } else {
          materialRef.current.color.set("#ff0000");
          materialRef.current.emissive.set("#aa0000");
        }
      }
    }
  });
  
  // Don't render if dead or invalid health
  const displayHealth = getHealth ? currentHealthRef.current : health;
  if (displayHealth <= 0 || maxHealth <= 0) {
    return null;
  }

  const healthPercent = Math.max(0, Math.min(1, displayHealth / maxHealth));
  const barWidth = 0.8; // Total width of the bar
  const barHeight = 0.08; // Height of the bar
  const barOffsetY = 0.5; // Offset above enemy center

  return (
    <group position={[0, barOffsetY, 0]}>
      {/* Background bar (dark red) */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[barWidth, barHeight]} />
        <meshStandardMaterial 
          color="#440000" 
          emissive="#220000" 
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Foreground bar (green, scales with health) */}
      <mesh 
        ref={foregroundRef}
        position={[-(barWidth / 2) * (1 - healthPercent), 0, 0.01]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[barWidth, barHeight]} />
        <meshStandardMaterial 
          ref={materialRef}
          color={healthPercent > 0.5 ? "#00ff00" : healthPercent > 0.25 ? "#ffff00" : "#ff0000"}
          emissive={healthPercent > 0.5 ? "#00aa00" : healthPercent > 0.25 ? "#aa8800" : "#aa0000"}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

