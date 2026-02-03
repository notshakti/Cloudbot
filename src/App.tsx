import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import * as THREE from 'three';
import { Bot, Cloud, Zap, MessageSquare, Globe, Users, ChevronRight, Send } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import BotDetail from './pages/BotDetail';

// Three.js Scene Component
function ThreeJSScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const icosahedronRef = useRef<THREE.Mesh | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.backgroundColor = 'transparent';
    canvas.style.pointerEvents = 'none';
    mount.appendChild(canvas);

    // Lighting – softer and more atmospheric
    const ambientLight = new THREE.AmbientLight(0xa78bfa, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xc4b5fd, 0.9);
    directionalLight.position.set(5, 5, 10);
    scene.add(directionalLight);
    const fillLight = new THREE.PointLight(0x818cf8, 0.3, 50);
    fillLight.position.set(-5, -5, 5);
    scene.add(fillLight);

    // Icosahedron – wireframe, subtle so it doesn’t compete with hero text
    const icosahedronGeometry = new THREE.IcosahedronGeometry(2.2, 0);
    const icosahedronMaterial = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const icosahedron = new THREE.Mesh(icosahedronGeometry, icosahedronMaterial);
    scene.add(icosahedron);

    // Second, smaller inner icosahedron for depth
    const innerGeometry = new THREE.IcosahedronGeometry(1.4, 0);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xc4b5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const innerIcosahedron = new THREE.Mesh(innerGeometry, innerMaterial);
    innerIcosahedron.rotation.order = 'YXZ';
    scene.add(innerIcosahedron);

    // Starfield – soft round stars, kept BEHIND camera to avoid white squares in view
    const starSprite = (() => {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.35, 'rgba(224,231,255,0.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.clearRect(0, 0, 32, 32);
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      const t = new THREE.CanvasTexture(c);
      t.needsUpdate = true;
      return t;
    })();
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 900;
    const positions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      // Keep all stars behind the camera (z < -8) so none appear as giant squares in front
      positions[i * 3 + 2] = -8 - Math.random() * 80;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xe0e7ff,
      size: 0.28,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      map: starSprite,
      depthWrite: false,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    icosahedronRef.current = icosahedron;
    starsRef.current = stars;

    camera.position.z = 10;

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // Main icosahedron – smooth rotation and gentle float
      icosahedron.rotation.x = Math.sin(time * 0.4) * 0.25;
      icosahedron.rotation.y = time * 0.15;
      icosahedron.rotation.z = Math.cos(time * 0.3) * 0.15;
      icosahedron.position.y = Math.sin(time * 0.6) * 0.4;

      // Inner icosahedron – opposite direction for depth
      innerIcosahedron.rotation.x = time * 0.12;
      innerIcosahedron.rotation.y = -time * 0.18;
      innerIcosahedron.position.y = Math.sin(time * 0.5 + 1) * 0.2;

      // Stars – slow rotation
      stars.rotation.y += 0.0003;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      icosahedronGeometry.dispose();
      icosahedronMaterial.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      starSprite.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none" />;
}

// Feature Card Component
function FeatureCard({ icon: Icon, title, description, delay = 0 }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; delay?: number }) {
  return (
    <div 
      className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:scale-[1.02]"
      style={{
        animation: `fadeInUp 0.8s ease-out ${delay}s both`
      }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-violet-500/20">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-300 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Step Component
function Step({ number, title, description, delay = 0 }: { number: number; title: string; description: string; delay?: number }) {
  return (
    <div 
      className="flex items-start space-x-6"
      style={{
        animation: `slideInLeft 0.8s ease-out ${delay}s both`
      }}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
        <span className="text-white font-bold text-lg">{number}</span>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-300">{description}</p>
      </div>
    </div>
  );
}

// Chat Demo Component
function ChatDemo() {
  const [messages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! How can I help you today?', time: '2:30 PM' },
    { id: 2, sender: 'user', text: 'What are your business hours?', time: '2:31 PM' },
    { id: 3, sender: 'bot', text: 'We\'re open 24/7! Our AI-powered support is always available to assist you.', time: '2:31 PM' },
  ]);

  return (
    <div className="max-w-md mx-auto bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-slate-900/50">
      <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-white font-semibold">AI Assistant</h4>
            <p className="text-blue-100 text-sm">Online</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4 h-64 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{
              animation: `fadeIn 0.5s ease-out ${index * 0.2}s both`
            }}
          >
            <div className={`max-w-xs px-4 py-2 rounded-2xl ${
              message.sender === 'user' 
                ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white'
                : 'bg-white/10 text-white border border-white/10'
            }`}>
              <p className="text-sm">{message.text}</p>
              <p className="text-xs opacity-70 mt-1">{message.time}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-violet-500/20">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const { user, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setEmail('');
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 via-40% to-slate-950 text-white overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow { animation: pulse 2.5s ease-in-out infinite; }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Bot className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">CloudBot</span>
            </Link>
            <div className="flex items-center gap-4 md:gap-8">
              <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">How It Works</a>
              <a href="#demo" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Demo</a>
              {user ? (
                <>
                  <Link to="/dashboard" className="px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 shadow-lg shadow-violet-500/20 transition-all duration-300">
                    Dashboard
                  </Link>
                  <button type="button" onClick={() => logout()} className="px-4 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                    Sign out
                  </button>
                </>
              ) : (
                <Link to="/login" className="px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 shadow-lg shadow-violet-500/20 transition-all duration-300">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* 3D Background */}
        <ThreeJSScene />
        {/* Gradient overlay for readability and cleaner look */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-slate-900/20 via-slate-900/50 to-slate-900/90 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_0%,rgba(15,23,42,0.4)_100%)] pointer-events-none" aria-hidden />

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center">
          <div className="max-w-4xl mx-auto" style={{ animation: 'fadeInUp 1s ease-out' }}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-r from-blue-300 via-violet-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(129,140,248,0.2)]">
                Next-Gen Cloud
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                Chatbot Platform
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              Powered by NLP, GCP, and serverless AI workflows.
              <br className="hidden sm:block" />
              Build intelligent conversations that scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/signup" className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 text-base font-semibold hover:from-blue-400 hover:to-violet-500 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/35 transition-all duration-300 flex items-center justify-center gap-2 group">
                <span>Get Started</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-white/20 bg-white/5 text-base font-semibold hover:bg-white/10 hover:border-white/30 transition-all duration-300 backdrop-blur-sm text-center">
                Sign in to create bots
              </Link>
            </div>
            <p className="mt-4 text-slate-400 text-sm">
              Sign in to create, train, and deploy your own chatbots from the dashboard.
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-pulse-slow">
          <div className="w-6 h-9 border-2 border-white/20 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 sm:py-28 relative bg-slate-900/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-white">How It Works</h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Deploy intelligent chatbots in three simple steps
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-10 sm:space-y-14">
            <Step 
              number={1} 
              title="Train Your Bot" 
              description="Upload your data and customize responses using our intuitive interface. Our NLP engine learns from your content to provide accurate, contextual answers."
              delay={0.2}
            />
            <Step 
              number={2} 
              title="Deploy to Cloud" 
              description="One-click deployment to Google Cloud Platform with automatic scaling. Your bot is ready to handle thousands of conversations simultaneously."
              delay={0.4}
            />
            <Step 
              number={3} 
              title="Integrate Channels" 
              description="Connect to websites, mobile apps, Slack, WhatsApp, and more. Manage all conversations from a single, unified dashboard."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-14 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-white">Powerful Features</h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Everything you need to build and deploy intelligent chatbots
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={MessageSquare}
              title="Advanced NLP"
              description="State-of-the-art natural language processing with intent recognition, entity extraction, and sentiment analysis."
              delay={0.1}
            />
            <FeatureCard
              icon={Cloud}
              title="Cloud Functions"
              description="Serverless architecture that scales automatically. Pay only for what you use with Google Cloud integration."
              delay={0.2}
            />
            <FeatureCard
              icon={Zap}
              title="API Hooks"
              description="Connect to any external service with webhooks and REST APIs. Integrate with your existing systems seamlessly."
              delay={0.3}
            />
            <FeatureCard
              icon={Globe}
              title="Multi-Channel"
              description="Deploy across web, mobile, social media, and messaging platforms from a single codebase."
              delay={0.4}
            />
            <FeatureCard
              icon={Users}
              title="Context Management"
              description="Maintain conversation context across sessions. Your bot remembers previous interactions for personalized experiences."
              delay={0.5}
            />
            <FeatureCard
              icon={Bot}
              title="Analytics Dashboard"
              description="Real-time insights into bot performance, user satisfaction, and conversation analytics with detailed reporting."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Live Chat Demo Section */}
      <section id="demo" className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-white tracking-tight">See It In Action</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Experience the power of our AI chatbot platform
            </p>
            <p className="mt-4 text-slate-400">
              {user ? (
                <Link to="/dashboard" className="text-violet-400 hover:text-violet-300 font-medium underline">
                  Go to Dashboard → create, train, and test your own bots
                </Link>
              ) : (
                <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium underline">
                  Sign in to create and train your own chatbots
                </Link>
              )}
            </p>
          </div>
          
          <div style={{ animation: 'fadeInUp 0.8s ease-out 0.3s both' }}>
            <ChatDemo />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-white tracking-tight">Ready to Get Started?</h2>
              <p className="text-xl text-slate-300">
                Request a demo and see how our platform can transform your customer interactions
              </p>
            </div>
            
            <form onSubmit={handleDemoSubmit} className="space-y-6">
              {demoSubmitted && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 text-emerald-300 text-center">
                  Thanks! We&apos;ll get back to you soon.
                </div>
              )}
              <div>
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 backdrop-blur-md"
                />
              </div>
              <div>
                <textarea
                  placeholder="Tell us about your use case"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 backdrop-blur-md resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 text-lg font-semibold hover:scale-[1.02] transition-transform duration-300 shadow-xl shadow-violet-500/20"
              >
                Request Demo
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">CloudBot</span>
            </div>
            <div className="flex items-center space-x-6 text-slate-400">
              <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="#terms" className="hover:text-white transition-colors">Terms</a>
              <a href="#support" className="hover:text-white transition-colors">Support</a>
              <span>&copy; 2025 CloudBot. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/bots/:botId" element={<BotDetail />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}