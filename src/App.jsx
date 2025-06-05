import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, useGLTF, Line } from '@react-three/drei';

// Custom component for animated stars with twinkling effect
const AnimatedStars = () => {
  const starsRef = useRef();
  const [twinkleFactors, setTwinkleFactors] = useState([]);
  
  // Initialize random twinkle factors for each star
  useEffect(() => {
    const starCount = 1000;
    const factors = [];
    for (let i = 0; i < starCount; i++) {
      factors.push({
        speed: 0.1 + Math.random() * 0.5,
        factor: Math.random(),
        direction: Math.random() > 0.5 ? 1 : -1
      });
    }
    setTwinkleFactors(factors);
  }, []);

  // Animation loop for stars
  useFrame((state, delta) => {
    if (starsRef.current && twinkleFactors.length > 0) {
      // Rotate stars slowly for ambient movement
      starsRef.current.rotation.x += delta * 0.02;
      starsRef.current.rotation.y += delta * 0.01;
      
      // Apply twinkling effect by updating the size attribute
      const sizes = starsRef.current.geometry.attributes.size;
      for (let i = 0; i < sizes.count; i++) {
        const tf = twinkleFactors[i % twinkleFactors.length];
        // Calculate new size based on time
        const newFactor = tf.factor + Math.sin(state.clock.elapsedTime * tf.speed) * 0.5 * tf.direction;
        sizes.array[i] = 0.5 + newFactor * 1.5; // Vary size between 0.5 and 2.0
      }
      sizes.needsUpdate = true;
    }
  });

  return (
    <Stars
      ref={starsRef}
      radius={100} // Size of the star field
      depth={50} // Depth/thickness of the star field
      count={1000} // Number of stars
      factor={4} // Size factor
      saturation={0.5} // Saturation of stars
      fade // Enables the fade effect
      speed={1} // Base animation speed
    />
  );
};

// Sun component using 3D model
const Sun = ({ scale = [0.7, 0.7, 0.7] }) => {
  const sunRef = useRef();
  const { scene } = useGLTF('/src/assets/Planets/sun.glb');
  
  // Subtle rotation animation for the sun
  useFrame((state, delta) => {
    if (sunRef.current) {
      // Rotate the sun slowly
      sunRef.current.rotation.y += delta * 0.1;
      
      // Subtle scale pulsation
      const pulseFactor = 1 + Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
      sunRef.current.scale.set(
        scale[0] * pulseFactor,
        scale[1] * pulseFactor,
        scale[2] * pulseFactor
      );
    }
  });

  return (
    <primitive 
      ref={sunRef} 
      object={scene} 
      position={[0, 0, 0]}
      scale={scale}
    />
  );
};

// Create orbit ring component
const OrbitRing = ({ distance }) => {
  // Create points for a circle
  const points = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push([
      Math.cos(theta) * distance,
      0,
      Math.sin(theta) * distance
    ]);
  }

  return (
    <Line
      points={points}
      color="white"
      lineWidth={0.5}
      opacity={0.3}
      transparent
    />
  );
};

// PlanetGLB component for loading 3D models
const PlanetGLB = ({ name, modelPath, position, scale, rotationSpeed = 0.5, fixMaterial = false, fixColor = '#fff' }) => {
  const { scene } = useGLTF(modelPath);
  const planetRef = useRef();
  
  // Fix material if needed (for Saturn/Uranus)
  useEffect(() => {
    if (fixMaterial && planetRef.current) {
      planetRef.current.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(fixColor);
          child.material.needsUpdate = true;
        }
      });
    }
  }, [fixMaterial, fixColor]);
  
  // Apply some rotation to make planets more visible
  useFrame((state, delta) => {
    if (planetRef.current) {
      // Add a slight tilt to the planets
      if (!planetRef.current.userData.initialized) {
        planetRef.current.rotation.x = Math.random() * 0.5;
        planetRef.current.userData.initialized = true;
      }
      // Planet rotation speed
      planetRef.current.rotation.y += delta * rotationSpeed;
    }
  });
  
  return (
    <primitive 
      ref={planetRef}
      object={scene} 
      position={position}
      scale={scale} 
      name={name}
      castShadow
      receiveShadow
    />
  );
};

// Naya component: RevolvingPlanetGroup
function RevolvingPlanetGroup({ planet, speed = 0.5 }) {
  const groupRef = useRef();
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Animate angle for revolution
      const angle = planet.initialAngle + state.clock.elapsedTime * speed / planet.distance;
      const x = Math.cos(angle) * planet.distance;
      const z = Math.sin(angle) * planet.distance;
      groupRef.current.position.set(x, 0, z);
    }
  });
  // Saturn/Uranus ke liye alag rotationSpeed aur material fix
  let rotationSpeed = 0.8;
  let fixMaterial = false;
  let fixColor = '#b5e0ff'; // Uranus ke liye halka blue, Saturn ke liye yellowish
  if (planet.name === 'Uranus') {
    rotationSpeed = 0.2;
    fixMaterial = true;
    fixColor = '#b5e0ff';
  }
  if (planet.name === 'Saturn') {
    fixMaterial = true;
    fixColor = '#ffe29a';
  }
  return (
    <group ref={groupRef}>
      <PlanetGLB
        name={planet.name}
        modelPath={planet.modelPath}
        position={[0, 0, 0]}
        scale={planet.scale}
        rotationSpeed={rotationSpeed}
        fixMaterial={fixMaterial}
        fixColor={fixColor}
      />
    </group>
  );
}

// Preload all 3D models
useGLTF.preload('/src/assets/Planets/sun.glb');
useGLTF.preload('/src/assets/Planets/mercury.glb');
useGLTF.preload('/src/assets/Planets/venus.glb');
useGLTF.preload('/src/assets/Planets/earth_and_clouds.glb');
useGLTF.preload('/src/assets/Planets/mars.glb');
useGLTF.preload('/src/assets/Planets/jupiter.glb');
useGLTF.preload('/src/assets/Planets/saturn.glb');
useGLTF.preload('/src/assets/Planets/uranus.glb');
useGLTF.preload('/src/assets/Planets/neptune.glb');

const App = () => {
  // Planet data with model paths, distances and scales
  const planets = [
    { name: 'Mercury', distance: 4, scale: [0.008, 0.008, 0.008], initialAngle: 0, modelPath: '/src/assets/Planets/mercury.glb' },
    { name: 'Venus', distance: 7, scale: [0.015, 0.015, 0.015], initialAngle: Math.PI / 4, modelPath: '/src/assets/Planets/venus.glb' },
    { name: 'Earth', distance: 10, scale: [0.017, 0.017, 0.017], initialAngle: Math.PI / 2, modelPath: '/src/assets/Planets/earth_and_clouds.glb' },
    { name: 'Mars', distance: 13, scale: [0.012, 0.012, 0.012], initialAngle: 3 * Math.PI / 4, modelPath: '/src/assets/Planets/mars.glb' },
    { name: 'Jupiter', distance: 22, scale: [0.055, 0.055, 0.055], initialAngle: Math.PI, modelPath: '/src/assets/Planets/jupiter.glb' },
    { name: 'Saturn', distance: 35, scale: [0.03, 0.03, 0.03], initialAngle: 5 * Math.PI / 4, modelPath: '/src/assets/Planets/saturn.glb' },
    { name: 'Uranus', distance: 55, scale: [0.02, 0.02, 0.02], initialAngle: 3 * Math.PI / 2, modelPath: '/src/assets/Planets/uranus.glb' },
    { name: 'Neptune', distance: 70, scale: [0.019, 0.019, 0.019], initialAngle: 7 * Math.PI / 4, modelPath: '/src/assets/Planets/neptune.glb' },
  ];

  return (
    <div className="w-screen h-screen bg-black">
      <Canvas className="w-full h-full">
        <color attach="background" args={['#000010']} />
        <fog attach="fog" args={['#000010', 30, 100]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.3} /> {/* Increased ambient light */}
        <pointLight position={[0, 0, 0]} intensity={3} distance={100} color="#FFA500" /> {/* Stronger sun light */}
        <hemisphereLight skyColor="#ffffbb" groundColor="#080820" intensity={0.5} /> {/* Additional light for better visibility */}
        
        {/* Scene elements */}
        <AnimatedStars />
        <Sun scale={[0.25, 0.25, 0.25]} />
        
        {/* Solar System Group - Ensures Sun is at center */}
        <group position={[0, 0, 0]}>
          {/* Planets with orbit rings */}
          {planets.map((planet) => (
            <React.Fragment key={planet.name}>
              {/* Orbit Ring */}
              <OrbitRing distance={planet.distance} />
              {/* Revolving Planet */}
              <RevolvingPlanetGroup planet={planet} />
            </React.Fragment>
          ))}
        </group>
        
        {/* Controls */}
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          rotateSpeed={0.3}
          zoomSpeed={0.5}
          minDistance={5}
          maxDistance={120} // ab aur zoom out kar sakte ho
          autoRotate 
          autoRotateSpeed={0.1}
        />
      </Canvas>
    </div>
  );
};

export default App;
