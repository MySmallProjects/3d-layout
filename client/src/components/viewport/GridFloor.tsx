import React from 'react';
import { Grid } from '@react-three/drei';
import { useSceneStore } from '../../store/sceneStore';

export const GridFloor: React.FC = () => {
  const gridVisible = useSceneStore((state) => state.gridVisible);

  if (!gridVisible) return null;

  return (
    <Grid
      position={[0, 0, 0]}
      infiniteGrid
      cellSize={1}
      cellThickness={1}
      cellColor="#2c313a"
      sectionSize={5}
      sectionThickness={1.5}
      sectionColor="#3d4452"
      fadeDistance={60}
      fadeStrength={1}
    />
  );
};
