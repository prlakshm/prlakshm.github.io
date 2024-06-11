import useSpline from '@splinetool/r3f-spline'
import { OrthographicCamera } from '@react-three/drei'

function Scene({ ...props }) {
  const { nodes, materials } = useSpline('https://prod.spline.design/HPmKUqxcFSLzL4ri/scene.splinecode')
  return (
    <>
      <color attach="background" args={['#767676']} />
      <group {...props} dispose={null}>
        <scene name="Scene 1">
          <mesh
            name="Rectangle"
            geometry={nodes.Rectangle.geometry}
            material={materials['Rectangle Material']}
            castShadow
            receiveShadow
            position={[-15.05, 159.79, -50.58]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[0.85, 0.83, 0.83]}
          />
          <mesh
            name="Sphere"
            geometry={nodes.Sphere.geometry}
            material={materials['Sphere Material']}
            receiveShadow
            position={[-14.58, -355.61, 58.72]}
            scale={[5.64, 7.02, 1.24]}
          />
          <directionalLight
            name="Directional Light 2"
            castShadow
            intensity={0.7}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={-10000}
            shadow-camera-far={100000}
            shadow-camera-left={-1000}
            shadow-camera-right={1000}
            shadow-camera-top={1000}
            shadow-camera-bottom={-1000}
            position={[125.56, 66.39, 298.89]}
            scale={[1.49, 2.01, 1]}
          />
          <group name="lotuses" position={[-86.41, -72.69, 26.41]} rotation={[0, 0.1, 0]} scale={451.5}>
            <group name="Lillypad1" position={[1.88, -0.24, 0.66]} rotation={[0, 0, 0]} scale={0.01}>
              <mesh
                name="defaultMaterial"
                geometry={nodes.defaultMaterial.geometry}
                material={nodes.defaultMaterial.material}
                castShadow
                receiveShadow
              />
              <mesh
                name="defaultMaterial_1"
                geometry={nodes.defaultMaterial_1.geometry}
                material={nodes.defaultMaterial_1.material}
                castShadow
                receiveShadow
              />
            </group>
            <group name="Lillypad2" position={[1.09, -0.22, 0.76]} rotation={[0, 0, 0]} scale={0.01}>
              <mesh
                name="defaultMaterial1"
                geometry={nodes.defaultMaterial1.geometry}
                material={nodes.defaultMaterial1.material}
                castShadow
                receiveShadow
              />
              <mesh
                name="defaultMaterial_11"
                geometry={nodes.defaultMaterial_11.geometry}
                material={nodes.defaultMaterial_11.material}
                castShadow
                receiveShadow
              />
            </group>
            <group name="Lillypad3" position={[-0.17, -0.24, 0.89]} rotation={[0, 0, 0]} scale={0.01}>
              <mesh
                name="defaultMaterial2"
                geometry={nodes.defaultMaterial2.geometry}
                material={nodes.defaultMaterial2.material}
                castShadow
                receiveShadow
              />
              <mesh
                name="defaultMaterial_12"
                geometry={nodes.defaultMaterial_12.geometry}
                material={nodes.defaultMaterial_12.material}
                castShadow
                receiveShadow
              />
            </group>
            <group name="Lillypad4" position={[-0.64, -0.21, 0.19]} rotation={[0, 0, 0]} scale={0.01}>
              <mesh
                name="defaultMaterial3"
                geometry={nodes.defaultMaterial3.geometry}
                material={nodes.defaultMaterial3.material}
                castShadow
                receiveShadow
              />
              <mesh
                name="defaultMaterial_13"
                geometry={nodes.defaultMaterial_13.geometry}
                material={nodes.defaultMaterial_13.material}
                castShadow
                receiveShadow
              />
            </group>
            <group name="Lillypad5" position={[-1.53, -0.23, 0.34]} rotation={[0, 0, 0]} scale={0.01}>
              <mesh
                name="defaultMaterial4"
                geometry={nodes.defaultMaterial4.geometry}
                material={nodes.defaultMaterial4.material}
                castShadow
                receiveShadow
              />
              <mesh
                name="defaultMaterial_14"
                geometry={nodes.defaultMaterial_14.geometry}
                material={nodes.defaultMaterial_14.material}
                castShadow
                receiveShadow
              />
            </group>
          </group>
          <directionalLight
            name="Directional Light"
            castShadow
            intensity={0.7}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={-10000}
            shadow-camera-far={100000}
            shadow-camera-left={-1000}
            shadow-camera-right={1000}
            shadow-camera-top={1000}
            shadow-camera-bottom={-1000}
            position={[200, 300, 300]}
          />
          <OrthographicCamera name="1" makeDefault={true} far={10000} near={-50000} />
          <hemisphereLight name="Default Ambient Light" intensity={0.75} color="#eaeaea" />
        </scene>
      </group>
    </>
  )
}

export default Scene;
