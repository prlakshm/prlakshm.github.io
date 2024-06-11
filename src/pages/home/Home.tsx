import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from "./Scene.js"
import "./home.css";


function Home() {
  return (
    <div className="home">
    <Suspense fallback={null}>
      <Canvas shadows flat linear>
        <Scene />
        <OrbitControls />
      </Canvas>
    </Suspense>
    </div>
  );
}

export default Home;
