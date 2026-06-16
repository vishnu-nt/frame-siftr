import React, { useState, useEffect } from "react";
import { AuthForm } from "./AuthForm";
import {
  Zap,
  ShieldCheck,
  Coins,
  ArrowRight,
  Keyboard,
  FolderOpen,
  Download,
  Camera,
  Star,
  Laptop,
} from "lucide-react";

interface LandingPageProps {
  onSuccessAuth: (session: any) => void;
}

interface MockImage {
  id: string;
  name: string;
  gradient: string;
  type: string;
  label: string | null;
}

const labelNames: { [key: string]: { name: string; color: string } } = {
  "1": {
    name: "Select",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  "2": {
    name: "Reject",
    color: "bg-red-500/20 text-red-300 border-red-500/40",
  },
  "3": {
    name: "Maybe",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  "4": {
    name: "Edit",
    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  },
  "5": {
    name: "Retouch",
    color: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({ onSuccessAuth }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Interactive Sandbox Simulator State
  const [mockImages, setMockImages] = useState<MockImage[]>([
    {
      id: "1",
      name: "DSC_3892_Sunset_Peak.NEF",
      gradient: "from-orange-500 via-pink-600 to-purple-800",
      type: "RAW Landscape",
      label: null,
    },
    {
      id: "2",
      name: "IMG_0411_Ocean_Breeze.CR3",
      gradient: "from-blue-600 via-cyan-500 to-indigo-800",
      type: "RAW Portrait",
      label: null,
    },
    {
      id: "3",
      name: "A7R_9210_Forest_Path.ARW",
      gradient: "from-emerald-600 via-teal-500 to-green-800",
      type: "RAW Nature",
      label: null,
    },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  // Listen for keyboard input in the simulator sandbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if auth modal is not open
      if (showAuthModal) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % mockImages.length);
        setSimFeedback(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + mockImages.length) % mockImages.length,
        );
        setSimFeedback(null);
      } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        const num = e.key;
        setMockImages((prev) => {
          const updated = [...prev];
          updated[activeIndex] = { ...updated[activeIndex], label: num };
          return updated;
        });
        setSimFeedback(`Assigned: ${labelNames[num].name}`);
        // Reset feedback after a bit
        setTimeout(() => setSimFeedback(null), 1200);
      } else if (e.key === "0" || e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        setMockImages((prev) => {
          const updated = [...prev];
          updated[activeIndex] = { ...updated[activeIndex], label: null };
          return updated;
        });
        setSimFeedback("Cleared label");
        setTimeout(() => setSimFeedback(null), 1200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, showAuthModal, mockImages.length]);

  const handleSimLabelClick = (num: string) => {
    setMockImages((prev) => {
      const updated = [...prev];
      updated[activeIndex] = { ...updated[activeIndex], label: num };
      return updated;
    });
    setSimFeedback(`Assigned: ${labelNames[num].name}`);
    setTimeout(() => setSimFeedback(null), 1200);
  };

  const handleSimClear = () => {
    setMockImages((prev) => {
      const updated = [...prev];
      updated[activeIndex] = { ...updated[activeIndex], label: null };
      return updated;
    });
    setSimFeedback("Cleared label");
    setTimeout(() => setSimFeedback(null), 1200);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 overflow-x-hidden font-sans selection:bg-indigo-500/30">
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-1/3 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Camera size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white bg-gradient-to-r from-white to-slate-300 bg-clip-text">
            Frame Siftr
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowAuthModal(true);
            }}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setShowAuthModal(true);
            }}
            className="text-xs font-semibold px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
          >
            Create Account
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300 font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Zero Latency Client-Side Photo Culling
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
          Cull thousands of RAW photos{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            without the wait.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed mb-10">
          A lightning-fast, privacy-first photo selector that runs entirely in
          your browser. Organize massive shoots instantly without uploading a
          single megabyte.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <button
            onClick={() => {
              setShowAuthModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-7 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl text-sm shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all group"
          >
            <span>Launch Culling Workspace</span>
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>

          <a
            href="#simulator"
            className="w-full sm:w-auto text-xs font-semibold py-3.5 px-6 bg-[#0E121E] hover:bg-[#151B2E] border border-white/5 hover:border-indigo-500/30 text-slate-300 rounded-xl transition-all"
          >
            Try Interactive Simulator
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
          <div className="p-6 bg-slate-900/30 border border-white/5 rounded-2xl backdrop-blur-md">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
              <Zap size={20} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              Zero Server Latency
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Tested to handle 10,000+ high-res RAW and JPEG images smoothly.
              Instant file scanning and keyboard culling rates without server
              roundtrips.
            </p>
          </div>

          <div className="p-6 bg-slate-900/30 border border-white/5 rounded-2xl backdrop-blur-md">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              100% Secure & Private
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Your assets never touch our servers. File parsing and IndexedDB
              metadata caching remain entirely local inside your browser
              sandbox.
            </p>
          </div>

          <div className="p-6 bg-slate-900/30 border border-white/5 rounded-2xl backdrop-blur-md">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
              <Coins size={20} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              Free Unlimited Culling
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Cull, tag, and export without limitations or tiers. Save your
              progress inside IndexedDB, and close your tab knowing your work is
              safe.
            </p>
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section
        id="simulator"
        className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5 scroll-mt-6"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Test the Speed: Interactive Simulator
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm font-light leading-relaxed">
            Click inside the simulator below to focus, then press numeric
            hotkeys <strong className="text-indigo-400">1 to 5</strong> to
            assign categories or{" "}
            <strong className="text-slate-300">Arrow keys</strong> to navigate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Simulator Window */}
          <div className="lg:col-span-8 bg-[#0b0e17] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Window Top Bar */}
            <div className="bg-[#0e1322] px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="text-xs text-slate-400 font-mono ml-2 truncate">
                  framesiftr_sim_workspace / {mockImages[activeIndex].name}
                </span>
              </div>
              {simFeedback && (
                <div className="text-xs font-semibold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded animate-bounce">
                  {simFeedback}
                </div>
              )}
            </div>

            {/* Sandbox Canvas */}
            <div className="relative aspect-[16/10] bg-slate-950 flex items-center justify-center p-6 select-none">
              {/* Active Image Canvas */}
              <div
                className={`w-full h-full rounded-lg bg-gradient-to-br ${mockImages[activeIndex].gradient} shadow-inner flex flex-col items-center justify-center relative transition-all duration-300 border-2 border-indigo-500/40`}
              >
                {/* Image Details Badge */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-md text-xs font-mono text-slate-200">
                  {mockImages[activeIndex].type}
                </div>

                {/* Rating Badge */}
                {mockImages[activeIndex].label && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Star
                      size={12}
                      className="text-yellow-400 fill-yellow-400"
                    />
                    <span className="text-xs font-bold font-mono text-white">
                      {labelNames[mockImages[activeIndex].label!].name}
                    </span>
                  </div>
                )}

                {/* Decorative Camera Sight */}
                <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border border-white/20" />
                </div>

                <span className="text-xs font-mono text-white/50 mt-4 uppercase tracking-widest">
                  Active Sandbox Frame
                </span>
              </div>
            </div>

            {/* Simulator Controls & Quick Bar */}
            <div className="bg-[#0e1322] px-6 py-4 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
              {/* Keypress quick select */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400 mr-1">
                  Labels:
                </span>
                {["1", "2", "3", "4", "5"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleSimLabelClick(num)}
                    className={`text-xs px-2.5 py-1.5 border rounded-md font-medium transition-all ${
                      mockImages[activeIndex].label === num
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md"
                        : "bg-slate-900 border-white/10 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <span className="font-mono bg-black/20 px-1 py-0.5 rounded text-[10px] mr-1">
                      {num}
                    </span>
                    {labelNames[num].name}
                  </button>
                ))}
                {mockImages[activeIndex].label && (
                  <button
                    onClick={handleSimClear}
                    className="text-xs px-2 py-1 text-slate-500 hover:text-slate-300 transition-colors ml-2"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Navigation Indicator */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setActiveIndex(
                      (prev) =>
                        (prev - 1 + mockImages.length) % mockImages.length,
                    )
                  }
                  className="px-2.5 py-1.5 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-md text-slate-300 text-xs transition"
                >
                  ◀
                </button>
                <span className="text-xs text-slate-400 font-mono">
                  {activeIndex + 1} / {mockImages.length}
                </span>
                <button
                  onClick={() =>
                    setActiveIndex((prev) => (prev + 1) % mockImages.length)
                  }
                  className="px-2.5 py-1.5 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-md text-slate-300 text-xs transition"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Instructions & Cheatsheet */}
          <div className="lg:col-span-4 space-y-6">
            {/* Culling instruction panel */}
            <div className="p-6 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl backdrop-blur-md">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                <Keyboard size={18} className="text-indigo-400" />
                Culling Sandbox
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light mb-4">
                Our hotkeys allow you to sort photos instantly. Try clicking on
                this panel to focus this window, then press keys to control the
                sandbox:
              </p>

              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-white/5">
                  <span>Next Photo</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px] text-white">
                    ▶ Arrow
                  </kbd>
                </li>
                <li className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-white/5">
                  <span>Previous Photo</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px] text-white">
                    ◀ Arrow
                  </kbd>
                </li>
                <li className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-white/5">
                  <span>Label & Rate</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px] text-white">
                    1 - 5 Keys
                  </kbd>
                </li>
                <li className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-white/5">
                  <span>Clear Selection</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px] text-white">
                    0 / Esc
                  </kbd>
                </li>
              </ul>
            </div>

            {/* Sandbox status info */}
            <div className="p-6 bg-slate-900/30 border border-white/5 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-2">
                Simulated Stats
              </h3>
              <div className="space-y-2 text-xs font-light text-slate-400">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Demo Labeled:</span>
                  <span className="font-mono text-white font-semibold">
                    {mockImages.filter((x) => x.label !== null).length} /{" "}
                    {mockImages.length}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Active Selection:</span>
                  <span className="font-mono text-white font-semibold">
                    {mockImages[activeIndex].label
                      ? labelNames[mockImages[activeIndex].label!].name
                      : "None"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Step-by-Step */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How Frame Siftr Works
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm font-light leading-relaxed">
            Three simple steps to unlock instant workflow organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative p-8 bg-slate-900/20 border border-white/5 rounded-2xl text-center flex flex-col items-center">
            <div className="absolute -top-5 w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
              1
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-850 flex items-center justify-center text-slate-300 mt-4 mb-5 border border-white/10">
              <Laptop size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Launch the App
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Create your free secure account. Set up your local project
              database within seconds inside your browser cache.
            </p>
          </div>

          <div className="relative p-8 bg-slate-900/20 border border-white/5 rounded-2xl text-center flex flex-col items-center">
            <div className="absolute -top-5 w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
              2
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-850 flex items-center justify-center text-slate-300 mt-4 mb-5 border border-white/10">
              <FolderOpen size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Select Image Folder
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Select the directory of photos directly from your disk. Frame
              Siftr reads them on-the-fly and generates instant visual grids.
            </p>
          </div>

          <div className="relative p-8 bg-slate-900/20 border border-white/5 rounded-2xl text-center flex flex-col items-center">
            <div className="absolute -top-5 w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
              3
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-850 flex items-center justify-center text-slate-300 mt-4 mb-5 border border-white/10">
              <Download size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Export Selection
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Press hotkeys to tag, then export assignments to JSON and run the
              helper shell script to instantly sort files on your actual disk.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center text-xs text-slate-500">
        <p className="mb-2">
          © {new Date().getFullYear()} Frame Siftr. Built for photographers,
          developers, and speed.
        </p>
        <p>
          No images are uploaded. High performance, complete database privacy,
          always free.
        </p>
      </footer>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <AuthForm
            onSuccess={(session) => {
              setShowAuthModal(false);
              onSuccessAuth(session);
            }}
            onClose={() => setShowAuthModal(false)}
          />
        </div>
      )}
    </div>
  );
};
