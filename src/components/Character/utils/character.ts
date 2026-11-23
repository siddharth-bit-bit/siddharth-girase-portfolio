import * as THREE from "three";
import {
  buildCinemaCameraGimbal,
  CinemaCameraGimbalRig,
} from "./cinemaCameraGimbal";
import { setCharTimeline, setAllTimeline } from "../../utils/GsapScroll";

const setCharacter = (
  _renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loadCharacter = () => {
    return new Promise<{ rig: CinemaCameraGimbalRig; scene: THREE.Group }>((resolve) => {
      const rig = buildCinemaCameraGimbal();

      rig.root.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = true;
        }
      });

      scene.add(rig.root);
      setCharTimeline(rig.root, camera);
      setAllTimeline();

      resolve({ rig, scene: rig.root });
    });
  };

  return { loadCharacter };
};

export default setCharacter;
