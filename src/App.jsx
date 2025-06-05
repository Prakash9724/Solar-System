import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, useGLTF, Line } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

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
const Sun = React.forwardRef(({ scale = [0.7, 0.7, 0.7], onPointerDown }, ref) => {
  const sunRef = ref || useRef();
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
      onPointerDown={onPointerDown}
    />
  );
});

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
const PlanetGLB = React.forwardRef(({ name, modelPath, position, scale, rotationSpeed = 0.5, fixMaterial = false, fixColor = '#fff', onPointerDown, style }, ref) => {
  const { scene } = useGLTF(modelPath);
  const planetRef = ref || useRef();
  
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
      onPointerDown={onPointerDown}
      style={style}
    />
  );
});

// Naya component: RevolvingPlanetGroup
function RevolvingPlanetGroup({ planet, speed = 0.5, onPlanetClick }) {
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
  // PlanetGLB ka ref pass karenge taki click par world position mil sake
  const planetGLBRef = useRef();
  return (
    <group ref={groupRef}>
      <PlanetGLB
        ref={planetGLBRef}
        name={planet.name}
        modelPath={planet.modelPath}
        position={[0, 0, 0]}
        scale={planet.scale}
        rotationSpeed={rotationSpeed}
        fixMaterial={fixMaterial}
        fixColor={fixColor}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (onPlanetClick) onPlanetClick(planet, planetGLBRef);
        }}
        style={{ cursor: 'pointer' }}
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

// Helper: Planet/Sun extra details
const planetDetails = {
  Mercury: {
    diameter: '4,880 km',
    mass: '3.30 × 10^23 kg',
    moons: '0',
    description: 'Mercury is the closest planet to the Sun and the smallest in the Solar System.'
  },
  Venus: {
    diameter: '12,104 km',
    mass: '4.87 × 10^24 kg',
    moons: '0',
    description: 'Venus is the hottest planet in our solar system and has a thick, toxic atmosphere.'
  },
  Earth: {
    diameter: '12,742 km',
    mass: '5.97 × 10^24 kg',
    moons: '1 (Moon)',
    description: 'Earth is the third planet from the Sun and the only astronomical object known to harbor life.'
  },
  Mars: {
    diameter: '6,779 km',
    mass: '6.42 × 10^23 kg',
    moons: '2 (Phobos, Deimos)',
    description: 'Mars is known as the Red Planet and is home to the tallest volcano and the deepest canyon in the solar system.'
  },
  Jupiter: {
    diameter: '139,820 km',
    mass: '1.90 × 10^27 kg',
    moons: '79',
    description: 'Jupiter is the largest planet in the Solar System and is known for its Great Red Spot.'
  },
  Saturn: {
    diameter: '116,460 km',
    mass: '5.68 × 10^26 kg',
    moons: '83',
    description: 'Saturn is famous for its beautiful rings made of ice and rock.'
  },
  Uranus: {
    diameter: '50,724 km',
    mass: '8.68 × 10^25 kg',
    moons: '27',
    description: 'Uranus rotates on its side and has a blue-green color due to methane in its atmosphere.'
  },
  Neptune: {
    diameter: '49,244 km',
    mass: '1.02 × 10^26 kg',
    moons: '14',
    description: 'Neptune is known for its deep blue color and supersonic winds.'
  },
  Sun: {
    diameter: '1,391,000 km',
    mass: '1.99 × 10^30 kg',
    moons: '-',
    description: 'The Sun is the star at the center of the Solar System. It is a nearly perfect ball of hot plasma.'
  }
};

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

  // Interactive zoom/focus states
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [planetWorldPos, setPlanetWorldPos] = useState([0,0,0]);
  const [selectedSun, setSelectedSun] = useState(false);
  const [sunWorldPos, setSunWorldPos] = useState([0,0,0]);
  const cameraDefault = { position: [0, 20, 60], target: [0, 0, 0] };
  const controlsRef = useRef();
  const sunRef = useRef();

  // Helper: Get world position of planet
  const handlePlanetClick = (planet, ref) => {
    if (ref && ref.current) {
      const pos = ref.current.getWorldPosition(new THREE.Vector3());
      setPlanetWorldPos([pos.x, pos.y, pos.z]);
      setSelectedPlanet(planet);
      setSelectedSun(false);
      console.log('Clicked:', planet.name);
    }
  };
  // Helper: Sun click
  const handleSunClick = () => {
    if (sunRef && sunRef.current) {
      const pos = sunRef.current.getWorldPosition(new THREE.Vector3());
      setSunWorldPos([pos.x, pos.y, pos.z]);
      setSelectedSun(true);
      setSelectedPlanet(null);
      console.log('Clicked: Sun');
    }
  };

  // Camera and controls focus logic (now supports sun and smooth)
  const CameraFocusEffect = () => {
    const { camera } = useThree();
    useEffect(() => {
      let frame;
      let focusPos, focusTarget;
      if (selectedSun && sunWorldPos) {
        focusPos = [sunWorldPos[0], sunWorldPos[1] + 2, sunWorldPos[2] + 2];
        focusTarget = new THREE.Vector3(sunWorldPos[0], sunWorldPos[1], sunWorldPos[2]);
      } else if (selectedPlanet && planetWorldPos) {
        focusPos = [planetWorldPos[0], planetWorldPos[1] + 2, planetWorldPos[2] + 2];
        focusTarget = new THREE.Vector3(planetWorldPos[0], planetWorldPos[1], planetWorldPos[2]);
      }
      if (focusPos && focusTarget) {
        let t = 0;
        const start = camera.position.clone();
        const end = { x: focusPos[0], y: focusPos[1], z: focusPos[2] };
        const startTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3();
        const animate = () => {
          t += 0.025;
          camera.position.lerpVectors(start, end, Math.min(t, 1));
          if (controlsRef.current) {
            controlsRef.current.target.lerpVectors(startTarget, focusTarget, Math.min(t, 1));
            controlsRef.current.update();
          }
          if (t < 1) {
            frame = requestAnimationFrame(animate);
          }
        };
        animate();
        return () => cancelAnimationFrame(frame);
      } else {
        // Reset to default view
        if (controlsRef.current) {
          controlsRef.current.target.set(cameraDefault.target[0], cameraDefault.target[1], cameraDefault.target[2]);
          controlsRef.current.update();
        }
        camera.position.set(cameraDefault.position[0], cameraDefault.position[1], cameraDefault.position[2]);
      }
    }, [selectedPlanet, planetWorldPos, selectedSun, sunWorldPos]);
    return null;
  };

  // Back/Close handler
  const handleBack = () => {
    setSelectedPlanet(null);
    setSelectedSun(false);
  };

  return (
    <div className="w-screen h-screen bg-black">
      {/* Left Info Panel (centered vertically) */}
      <AnimatePresence>
        {(selectedPlanet || selectedSun) && (
          <motion.div
            initial={{ x: -200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 340,
              background: 'rgba(20,20,30,0.97)',
              color: '#fff',
              padding: 32,
              borderRadius: '0 24px 24px 0',
              zIndex: 30,
              boxShadow: '2px 0 24px #000a',
              minHeight: 260,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            {/* Close Button */}
            <motion.button
              onClick={handleBack}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: '#222',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                fontSize: 22,
                cursor: 'pointer',
                boxShadow: '0 2px 8px #0008',
                zIndex: 40
              }}
              aria-label="Back"
            >✕</motion.button>
            {/* Name & Image */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              style={{ fontSize: 32, marginBottom: 8, letterSpacing: 1, fontWeight: 700, textAlign: 'center' }}
            >
              {selectedSun ? 'Sun' : selectedPlanet?.name}
            </motion.h2>
            <motion.img
              src={selectedSun ? '/src/assets/Planets/sun.jpg' : `/src/assets/Planets/${selectedPlanet?.name?.toLowerCase()}.jpg`}
              alt={selectedSun ? 'Sun' : selectedPlanet?.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.22, duration: 0.5 }}
              style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', background: '#222', marginBottom: 10, boxShadow: '0 2px 12px #0007' }}
              onError={e => e.target.style.display = 'none'}
            />
            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.32, duration: 0.5 }}
              style={{ fontSize: 17, margin: '8px 0 0 0', textAlign: 'center', color: '#e0e0e0' }}
            >
              {selectedSun
                ? planetDetails.Sun.description
                : planetDetails[selectedPlanet?.name]?.description}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Right Info Panel (centered vertically) */}
      <AnimatePresence>
        {(selectedPlanet || selectedSun) && (
          <motion.div
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 340,
              background: 'rgba(20,20,30,0.97)',
              color: '#fff',
              padding: 32,
              borderRadius: '24px 0 0 24px',
              zIndex: 30,
              boxShadow: '-2px 0 24px #000a',
              minHeight: 260,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.18, duration: 0.5 }}
              style={{ fontSize: 22, marginBottom: 10, textAlign: 'center' }}
            >Quick Facts</motion.h3>
            {/* Facts (staggered animation) */}
            <motion.ul
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.13 } }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                margin: 0,
                padding: 0,
                listStyle: 'none',
                width: '100%'
              }}
            >
              {selectedSun ? (
                [
                  { label: 'Type', value: 'Star' },
                  { label: 'Diameter', value: planetDetails.Sun.diameter },
                  { label: 'Mass', value: planetDetails.Sun.mass },
                  { label: 'Surface Temp', value: '5,505°C' },
                  { label: 'Distance from Earth', value: '149.6 million km' }
                ].map((fact, i) => (
                  <motion.li
                    key={fact.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: 0.45 + i * 0.13, duration: 0.4 }}
                    style={{
                      background: '#23233a',
                      borderRadius: 8,
                      padding: '10px 18px',
                      fontSize: 15,
                      color: '#fff',
                      minWidth: 180,
                      textAlign: 'center',
                      boxShadow: '0 1px 4px #0004'
                    }}
                  >
                    <b>{fact.label}:</b> {fact.value}
                  </motion.li>
                ))
              ) : selectedPlanet ? (
                [
                  { label: 'Diameter', value: planetDetails[selectedPlanet.name]?.diameter },
                  { label: 'Mass', value: planetDetails[selectedPlanet.name]?.mass },
                  { label: 'Moons', value: planetDetails[selectedPlanet.name]?.moons },
                  { label: 'Distance from Sun', value: `${selectedPlanet.distance} AU` },
                  { label: 'Scale', value: selectedPlanet.scale[0] },
                  { label: 'Initial Orbit Angle', value: selectedPlanet.initialAngle.toFixed(2) },
                  { label: 'Model', value: selectedPlanet.modelPath.split('/').pop() }
                ].map((fact, i) => (
                  <motion.li
                    key={fact.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: 0.45 + i * 0.13, duration: 0.4 }}
                    style={{
                      background: '#23233a',
                      borderRadius: 8,
                      padding: '10px 18px',
                      fontSize: 15,
                      color: '#fff',
                      minWidth: 180,
                      textAlign: 'center',
                      boxShadow: '0 1px 4px #0004'
                    }}
                  >
                    <b>{fact.label}:</b> {fact.value}
                  </motion.li>
                ))
              ) : null}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
      <Canvas className="w-full h-full">
        <color attach="background" args={['#000010']} />
        <fog attach="fog" args={['#000010', 30, 100]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.3} /> {/* Increased ambient light */}
        <pointLight position={[0, 0, 0]} intensity={3} distance={100} color="#FFA500" /> {/* Stronger sun light */}
        <hemisphereLight skyColor="#ffffbb" groundColor="#080820" intensity={0.5} /> {/* Additional light for better visibility */}
        
        {/* Scene elements */}
        <AnimatedStars />
        <Sun ref={sunRef} scale={[0.25, 0.25, 0.25]} onPointerDown={handleSunClick} />
        
        {/* Solar System Group - Ensures Sun is at center */}
        <group position={[0, 0, 0]}>
          {/* Planets with orbit rings */}
          {planets.map((planet) => (
            <React.Fragment key={planet.name}>
              {/* Orbit Ring */}
              <OrbitRing distance={planet.distance} />
              {/* Revolving Planet with click handler */}
              <RevolvingPlanetGroup 
                planet={planet} 
                onPlanetClick={handlePlanetClick} 
              />
            </React.Fragment>
          ))}
        </group>
        
        {/* Controls */}
        <OrbitControls 
          ref={controlsRef}
          enableZoom={true}
          enablePan={true}
          rotateSpeed={0.3}
          zoomSpeed={0.5}
          minDistance={5}
          maxDistance={120}
          autoRotate={!(selectedPlanet || selectedSun)}
          autoRotateSpeed={0.1}
        />
        {/* Camera focus effect (supports sun/planet) */}
        <CameraFocusEffect />
      </Canvas>
    </div>
  );
};

export default App;
