import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Info, GitFork, Compass, Layers, ShieldCheck, 
  HelpCircle, Settings, ArrowLeft, Cpu, Activity, 
  DollarSign, Package, RefreshCw, Layers3, CheckCircle,
  Hash, Disc, AlertTriangle, Mic, Image as ImageIcon, User, Edit, Trash2, Plus, X, Globe, BarChart2, CornerDownRight, Zap
} from 'lucide-react';
import localCatalog from './catalog.json';

const API_BASE_URL = 'http://localhost:8082/api';

export default function App() {
  // Navigation States
  const [activeTab, setActiveTab] = useState('home'); // home, search, systems, diagram, graph, assistant, ocr, admin
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [selectedKitId, setSelectedKitId] = useState(null);
  const [selectedDiagramId, setSelectedDiagramId] = useState(1);

  // Command Palette State
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  // Voice Search State
  const [isListening, setIsListening] = useState(false);

  // Database Data States
  const [parts, setParts] = useState([]);
  const [kits, setKits] = useState([]);
  const [systems, setSystems] = useState([]);
  const [models, setModels] = useState([]);
  const [brands, setBrands] = useState([]);
  const [diagrams, setDiagrams] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [apiStatus, setApiStatus] = useState('connecting'); // connecting, live, offline_fallback

  // Universal Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterIsKit, setFilterIsKit] = useState('all'); // all, kits, parts

  // Exploded Diagram Interaction
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  // AI Assistant Chat States
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your Motorcycle Parts Intelligence Assistant. Ask me questions like:\n• "Which bikes use spark plug 31917-AAC-H00?"\n• "Show me all clutch plates for Splendor."\n• "Find a cheaper alternative for sprocket."\n• "Show engine parts for Passion Plus."' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // OCR Scanner States
  const [ocrImage, setOcrImage] = useState(null);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  // Admin CRUD States
  const [adminSection, setAdminSection] = useState('parts'); // parts, brands, models
  const [adminPartForm, setAdminPartForm] = useState({
    partNumber: '', name: '', normalizedName: '', category: 'Electrical',
    mrp: 0.0, quantity: 1, isKit: false, description: '', oemNumber: '',
    rackLocation: 'RACK-A1', reorderLevel: 5, supplier: 'OEM Direct'
  });
  const [editingPartId, setEditingPartId] = useState(null);

  // Search History & Stats tracking
  const [searchHistory, setSearchHistory] = useState(['Spark Plug', 'Splendor clutch plate', '31917-AAC-H00']);
  const [mostSearched, setMostSearched] = useState([
    { query: '31917-AAC-H00', count: 145 },
    { query: 'Splendor clutch plate', count: 98 },
    { query: 'Brake shoe', count: 72 }
  ]);

  // Attempt API connection, fall back to localCatalog
  async function loadData() {
    try {
      setApiStatus('connecting');
      const partsRes = await fetch(`${API_BASE_URL}/parts`);
      if (!partsRes.ok) throw new Error('API server returned error');
      
      const kitsRes = await fetch(`${API_BASE_URL}/kits`);
      const systemsRes = await fetch(`${API_BASE_URL}/systems`);
      const brandsRes = await fetch(`${API_BASE_URL}/brands`);
      const modelsRes = await fetch(`${API_BASE_URL}/models`);
      const diagramsRes = await fetch(`${API_BASE_URL}/diagrams`);
      
      const partsData = await partsRes.json();
      const kitsData = await kitsRes.json();
      const systemsData = await systemsRes.json();
      const brandsData = await brandsRes.json();
      const modelsData = await modelsRes.json();
      const diagramsData = await diagramsRes.json();

      setParts(partsData);
      setKits(kitsData);
      setSystems(systemsData);
      setBrands(brandsData);
      setModels(modelsData);
      setDiagrams(diagramsData);
      setRelationships(localCatalog.part_relationships || []);
      setApiStatus('live');
    } catch (err) {
      console.warn('Backend API connection failed, falling back to local dataset:', err);
      setParts(localCatalog.parts || []);
      setKits(localCatalog.kits || []);
      setSystems(localCatalog.systems || []);
      setBrands(localCatalog.brands || []);
      setModels(localCatalog.models || []);
      setDiagrams(localCatalog.exploded_diagrams || []);
      setRelationships(localCatalog.part_relationships || []);
      setApiStatus('offline_fallback');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Listen for Cmd+K or Ctrl+K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Voice Search Handler
  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please try Google Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setSearchQuery(speechToText);
      setActiveTab('search');
      setIsListening(false);
      // add to search history
      setSearchHistory(prev => [speechToText, ...prev.slice(0, 5)]);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  // Helper: Find part details
  const partDetails = useMemo(() => {
    if (!selectedPartId) return null;
    const part = parts.find(p => p.id === Number(selectedPartId));
    if (!part) return null;

    // Find if it has parent kits
    const parentKits = relationships
      .filter(r => r.child_part_id === part.id)
      .map(r => {
        const k = kits.find(kit => kit.id === r.kit_id);
        const parentP = parts.find(p => p.id === r.parent_part_id);
        return { kit: k, parentPart: parentP, quantity: r.quantity };
      });

    // Find child parts if it is a kit
    const childParts = relationships
      .filter(r => r.parent_part_id === part.id)
      .map(r => {
        const childP = parts.find(p => p.id === r.child_part_id);
        return { part: childP, quantity: r.quantity };
      })
      .filter(c => c.part !== undefined);

    // Find compatibility mapping
    const compatible = localCatalog.compatibility
      ?.filter(c => c.part_id === part.id)
      ?.map(c => models.find(m => m.id === c.model_id))
      ?.filter(Boolean) || [];

    // Map Diagram Info
    const partDiagram = diagrams.find(d => d.id === part.diagram_id);

    return {
      ...part,
      parentKits,
      childParts,
      compatibleModels: compatible,
      diagramInfo: partDiagram
    };
  }, [selectedPartId, parts, kits, relationships, models, diagrams]);

  // Sibling and related parts
  const relatedParts = useMemo(() => {
    if (!selectedPartId) return [];
    const activePart = parts.find(p => p.id === Number(selectedPartId));
    if (!activePart) return [];
    
    const relatedSet = new Set();
    
    // Find sibling parts in the same kit
    relationships.filter(r => r.child_part_id === activePart.id).forEach(r => {
      relationships.filter(rel => rel.kit_id === r.kit_id && rel.child_part_id !== activePart.id).forEach(rel => {
        const p = parts.find(part => part.id === rel.child_part_id);
        if (p) relatedSet.add(p);
      });
    });

    // Same category/system fallback
    parts.filter(p => p.category === activePart.category && p.id !== activePart.id).forEach(p => {
      if (relatedSet.size < 6) relatedSet.add(p);
    });

    return Array.from(relatedSet);
  }, [selectedPartId, parts, relationships]);

  // Universal Filter Logic
  const filteredPartsList = useMemo(() => {
    return parts.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      
      // Match keywords across fields
      const matchesSearch = q === '' || 
        p.name.toLowerCase().includes(q) || 
        p.normalizedName.toLowerCase().includes(q) || 
        p.partNumber.toLowerCase().includes(q) ||
        (p.oemNumber && p.oemNumber.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.subSystem && p.subSystem.toLowerCase().includes(q));

      // Category filter
      const matchesCategory = filterCategory === '' || p.category === filterCategory;

      // Kit filter
      const matchesKit = filterIsKit === 'all' || 
        (filterIsKit === 'kits' && p.isKit) || 
        (filterIsKit === 'parts' && !p.isKit);

      // Model Compatibility Filter
      let matchesModel = true;
      if (filterModel !== '') {
        const compIds = localCatalog.compatibility
          ?.filter(c => c.model_id === Number(filterModel))
          ?.map(c => c.part_id) || [];
        matchesModel = compIds.includes(p.id);
      }

      return matchesSearch && matchesCategory && matchesKit && matchesModel;
    });
  }, [parts, searchQuery, filterCategory, filterIsKit, filterModel]);

  // Statistics calculation for Dashboard
  const dashboardStats = useMemo(() => {
    const totalBrands = brands.length;
    const totalModels = models.length;
    const totalParts = parts.length;
    const lowStock = parts.filter(p => p.quantity <= (p.reorderLevel || 5)).length;
    
    // Fast moving parts are items with high sales count
    const fastMoving = parts
      .map(p => {
        const sales = p.salesHistory ? p.salesHistory.split(',').map(Number).reduce((a,b)=>a+b, 0) : 0;
        return { ...p, totalSales: sales };
      })
      .sort((a,b) => b.totalSales - a.totalSales)
      .slice(0, 4);

    return { totalBrands, totalModels, totalParts, lowStock, fastMoving };
  }, [brands, models, parts]);

  // Quick nav utility
  const viewPart = (id) => {
    setSelectedPartId(id);
    setActiveTab('part-detail');
    setHoveredHotspot(null);
    setSelectedHotspot(null);
  };

  // SVG Hotspot Interactions
  const activeDiagram = useMemo(() => {
    return diagrams.find(d => d.id === selectedDiagramId);
  }, [diagrams, selectedDiagramId]);

  const activeDiagramParts = useMemo(() => {
    return parts.filter(p => p.diagram_id === selectedDiagramId);
  }, [parts, selectedDiagramId]);

  const handleHotspotClick = (num) => {
    setSelectedHotspot(num);
    const matchedPart = activeDiagramParts.find(p => p.hotspotNumber === num);
    if (matchedPart) {
      // scroll to table row or directly view details
      viewPart(matchedPart.id);
    }
  };

  // Command Palette Items Filter
  const commandFilteredItems = useMemo(() => {
    if (!commandQuery.trim()) return [];
    const q = commandQuery.toLowerCase();
    
    const matchesParts = parts.filter(p => 
      p.normalizedName.toLowerCase().includes(q) || 
      p.partNumber.toLowerCase().includes(q)
    ).slice(0, 5).map(p => ({ type: 'part', label: `${p.partNumber} - ${p.normalizedName}`, action: () => viewPart(p.id) }));

    const matchesModels = models.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.family.toLowerCase().includes(q)
    ).slice(0, 3).map(m => ({ 
      type: 'model', 
      label: `${m.brand?.name || 'Bike'} ${m.name} (${m.year})`, 
      action: () => { setFilterModel(m.id); setActiveTab('search'); } 
    }));

    return [...matchesParts, ...matchesModels];
  }, [commandQuery, parts, models]);

  // Simulated AI Engine
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    setTimeout(() => {
      const q = userText.toLowerCase();
      let aiText = "I parsed your query but couldn't locate specific parts. Try mentioning models like 'Splendor' or part numbers like '31917-AAC-H00'.";
      let matchedItems = [];

      if (q.includes('clutch') && q.includes('splendor')) {
        matchedItems = parts.filter(p => p.category === 'Clutch' && p.normalizedName.toLowerCase().includes('clutch'));
        aiText = `I found ${matchedItems.length} clutch parts compatible with Hero Splendor:`;
      } else if (q.includes('spark plug') || q.includes('bikes use this spark plug') || q.includes('31917-aac-h00')) {
        const plug = parts.find(p => p.partNumber === '31917-AAC-H00');
        if (plug) {
          matchedItems = [plug];
          aiText = `Spark plug **31917-AAC-H00** is used in several commuter models, including Splendor Plus, HF Deluxe, and Passion Pro. Details:`;
        }
      } else if (q.includes('alternative') || q.includes('cheaper')) {
        matchedItems = parts.filter(p => p.alternatives !== null).slice(0, 3);
        aiText = `Here are parts in our intelligence engine with cheaper cross-compatible options listed:`;
      } else if (q.includes('engine') && q.includes('passion')) {
        matchedItems = parts.filter(p => p.category === 'Engine');
        aiText = `Here are the active engine components currently in the repository catalog:`;
      } else if (q.includes('cylinder head')) {
        matchedItems = parts.filter(p => p.subSystem === 'Cylinder Head');
        aiText = `Found the following components cataloged under the 'Cylinder Head' subsystem:`;
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiText, items: matchedItems }]);
    }, 800);
  };

  // Simulated OCR Scanner
  const simulateOcrScanner = (sampleLabel) => {
    setIsOcrScanning(true);
    setOcrResult(null);
    setTimeout(() => {
      let code = '31917-AAC-H00'; // Default Spark Plug
      let oem = 'OEM-SPK-31917';
      let confidence = '98.5%';
      
      if (sampleLabel === 'chain') {
        code = '40530-KCC-900';
        oem = 'OEM-CHN-40530';
        confidence = '96.2%';
      } else if (sampleLabel === 'clutch') {
        code = '22201-KCC-900S';
        oem = 'OEM-CLT-22201S';
        confidence = '97.8%';
      }

      setOcrResult({ partNumber: code, oemNumber: oem, confidence });
      setIsOcrScanning(false);
    }, 1500);
  };

  // Admin CRUD Functions
  const handleSavePart = async (e) => {
    e.preventDefault();
    try {
      const partPayload = {
        ...adminPartForm,
        id: editingPartId,
        mrp: Number(adminPartForm.mrp),
        quantity: Number(adminPartForm.quantity),
        reorderLevel: Number(adminPartForm.reorderLevel),
        lastPurchasePrice: Number(adminPartForm.lastPurchasePrice || 0),
        dealerPrice: Number(adminPartForm.dealerPrice || 0)
      };

      if (apiStatus === 'live') {
        const response = await fetch(`${API_BASE_URL}/parts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partPayload)
        });
        if (response.ok) {
          alert('Part saved successfully in PostgreSQL database!');
          loadData();
        }
      } else {
        // Offline Mock updates
        if (editingPartId) {
          setParts(prev => prev.map(p => p.id === editingPartId ? { ...p, ...partPayload } : p));
        } else {
          const newPart = { ...partPayload, id: Date.now() };
          setParts(prev => [...prev, newPart]);
        }
        alert('Part saved locally (Running in Offline Fallback Mode)!');
      }

      // Reset form
      setAdminPartForm({
        partNumber: '', name: '', normalizedName: '', category: 'Electrical',
        mrp: 0.0, quantity: 1, isKit: false, description: '', oemNumber: '',
        rackLocation: 'RACK-A1', reorderLevel: 5, supplier: 'OEM Direct'
      });
      setEditingPartId(null);
    } catch (err) {
      alert('Failed to save part: ' + err.message);
    }
  };

  const handleDeletePart = async (id) => {
    if (!confirm('Are you sure you want to delete this part?')) return;
    try {
      if (apiStatus === 'live') {
        const response = await fetch(`${API_BASE_URL}/parts/${id}`, { method: 'DELETE' });
        if (response.ok) {
          alert('Part deleted successfully from PostgreSQL!');
          loadData();
        }
      } else {
        setParts(prev => prev.filter(p => p.id !== id));
        alert('Part deleted locally (Offline Mode)!');
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-darker)', color: 'var(--text-primary)' }}>
      
      {/* 1. Sidebar Navigation */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>
            <Cpu size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={styles.logoText}>MOTO INTEL</h1>
            <span style={styles.logoSubText}>PARTS PLATFORM</span>
          </div>
        </div>

        <nav style={styles.navMenu}>
          <button onClick={() => { setActiveTab('home'); }} style={{ ...styles.navItem, ...(activeTab === 'home' ? styles.navItemActive : {}) }}>
            <Compass size={18} /> Dashboard
          </button>
          
          <button onClick={() => { setActiveTab('search'); }} style={{ ...styles.navItem, ...(activeTab === 'search' || activeTab === 'part-detail' ? styles.navItemActive : {}) }}>
            <Search size={18} /> Universal Catalog
          </button>

          <button onClick={() => { setActiveTab('diagram'); }} style={{ ...styles.navItem, ...(activeTab === 'diagram' ? styles.navItemActive : {}) }}>
            <Layers size={18} /> Exploded Diagrams
          </button>

          <button onClick={() => { setActiveTab('systems'); }} style={{ ...styles.navItem, ...(activeTab === 'systems' ? styles.navItemActive : {}) }}>
            <Layers3 size={18} /> Systems Explorer
          </button>

          <button onClick={() => { setActiveTab('graph'); }} style={{ ...styles.navItem, ...(activeTab === 'graph' ? styles.navItemActive : {}) }}>
            <GitFork size={18} /> Knowledge Graph
          </button>

          <button onClick={() => { setActiveTab('assistant'); }} style={{ ...styles.navItem, ...(activeTab === 'assistant' ? styles.navItemActive : {}) }}>
            <Zap size={18} /> AI Chat Assistant
          </button>

          <button onClick={() => { setActiveTab('ocr'); }} style={{ ...styles.navItem, ...(activeTab === 'ocr' ? styles.navItemActive : {}) }}>
            <ImageIcon size={18} /> OCR Part Scanner
          </button>

          <button onClick={() => { setActiveTab('admin'); }} style={{ ...styles.navItem, ...(activeTab === 'admin' ? styles.navItemActive : {}) }}>
            <Settings size={18} /> Admin Console
          </button>
        </nav>

        {/* Connection Status Badge */}
        <div style={styles.sidebarFooter}>
          {apiStatus === 'live' ? (
            <div style={{ ...styles.statusBadge, color: 'var(--success)', background: 'rgba(16,185,129,0.1)' }}>
              <CheckCircle size={14} /> LIVE POSTGRES API
            </div>
          ) : (
            <div style={{ ...styles.statusBadge, color: 'var(--warning)', background: 'rgba(245,158,11,0.1)' }}>
              <ShieldCheck size={14} /> LOCAL ARCHIVE
            </div>
          )}
          <div style={styles.footerInfo}>
            <p>Database: 16 Brands Mapped</p>
            <p>Components Count: {parts.length}</p>
            <p style={{ color: 'var(--accent-primary)', cursor: 'pointer', marginTop: '6px', fontWeight: 'bold' }} onClick={() => setShowCommandPalette(true)}>
              ⌘K / Ctrl+K Command Palette
            </p>
          </div>
        </div>
      </aside>

      {/* 2. Command Palette Overlay */}
      {showCommandPalette && (
        <div style={styles.modalOverlay} onClick={() => setShowCommandPalette(false)}>
          <div style={styles.commandPaletteCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.commandHeader}>
              <Search size={20} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Search catalog, models, or type commands..." 
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                style={styles.commandInput}
                autoFocus
              />
              <button onClick={() => setShowCommandPalette(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            
            <div style={styles.commandList}>
              {commandFilteredItems.length > 0 ? (
                commandFilteredItems.map((item, idx) => (
                  <div key={idx} style={styles.commandItem} onClick={() => { item.action(); setShowCommandPalette(false); }}>
                    {item.type === 'part' ? <Hash size={14} /> : <Disc size={14} />}
                    <span>{item.label}</span>
                  </div>
                ))
              ) : (
                <>
                  <div style={styles.commandLabel}>QUICK SHORTCUTS</div>
                  <div style={styles.commandItem} onClick={() => { setActiveTab('home'); setShowCommandPalette(false); }}><Compass size={14} /> Navigate to Dashboard</div>
                  <div style={styles.commandItem} onClick={() => { setActiveTab('search'); setShowCommandPalette(false); }}><Search size={14} /> Search & Catalog</div>
                  <div style={styles.commandItem} onClick={() => { setActiveTab('diagram'); setShowCommandPalette(false); }}><Layers size={14} /> Exploded Diagrams</div>
                  <div style={styles.commandItem} onClick={() => { setActiveTab('systems'); setShowCommandPalette(false); }}><Layers3 size={14} /> System Directory</div>
                  <div style={styles.commandItem} onClick={() => { setActiveTab('assistant'); setShowCommandPalette(false); }}><Zap size={14} /> Ask AI Assistant</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      <main style={styles.mainContainer}>

        {/* TAB: DASHBOARD (HOME) */}
        {activeTab === 'home' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Hero Header Block */}
            <div style={styles.heroBanner}>
              <div style={{ flex: 1 }}>
                <div style={styles.badgePremium}>OEM INTEL PLATFORM v2.1</div>
                <h2 style={styles.heroTitle}>World-Class Parts Intelligence Hub</h2>
                <p style={styles.heroSub}>
                  OEM-grade hierarchical parts lookup for all major Indian two-wheeler brands. Powered by a live compatibility graph, SVG diagram mapping, and cost alternatives logic.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={styles.heroSearchContainer}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input 
                      type="text" 
                      placeholder="Enter Part #, description, or compatible model family..." 
                      style={styles.heroSearchInput}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setActiveTab('search');
                      }}
                    />
                  </div>
                  <button onClick={startVoiceSearch} style={{ ...styles.btnPrimary, background: isListening ? 'var(--danger)' : 'var(--accent-gradient)', padding: '12px' }}>
                    <Mic size={18} className={isListening ? 'spin' : ''} />
                  </button>
                </div>
              </div>
              <div style={styles.statsPanelRight}>
                <div style={styles.statMiniBox}>
                  <Globe size={18} color="var(--accent-primary)" />
                  <div>
                    <div style={styles.statVal}>{dashboardStats.totalBrands}</div>
                    <div style={styles.statLabel}>OEM Brands</div>
                  </div>
                </div>
                <div style={styles.statMiniBox}>
                  <Layers3 size={18} color="var(--accent-secondary)" />
                  <div>
                    <div style={styles.statVal}>{dashboardStats.totalModels}</div>
                    <div style={styles.statLabel}>Motorcycles</div>
                  </div>
                </div>
                <div style={styles.statMiniBox}>
                  <Package size={18} color="var(--success)" />
                  <div>
                    <div style={styles.statVal}>{dashboardStats.totalParts}</div>
                    <div style={styles.statLabel}>Catalog Spares</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick-Alert Alert & History widgets */}
            <div style={styles.twoColumnGrid}>
              
              {/* Low Stock Alerts */}
              <div className="glass-card" style={styles.listSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={styles.sectionTitle}>⚠️ Low Stock Warnings</h3>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    {dashboardStats.lowStock} Items
                  </span>
                </div>
                <div style={styles.listContainer}>
                  {parts.filter(p => p.quantity <= (p.reorderLevel || 5)).slice(0, 4).map(part => (
                    <div key={part.id} style={styles.listItem} onClick={() => viewPart(part.id)}>
                      <div>
                        <div style={styles.listItemCode}>{part.partNumber}</div>
                        <div style={styles.listItemName}>{part.normalizedName}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 'bold' }}>Stock: {part.quantity}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rack: {part.rackLocation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fast Moving Inventory */}
              <div className="glass-card" style={styles.listSection}>
                <h3 style={styles.sectionTitle}><Activity size={16} style={{ marginRight: '6px' }} /> Fast Moving Parts</h3>
                <div style={styles.listContainer}>
                  {dashboardStats.fastMoving.map(part => (
                    <div key={part.id} style={styles.listItem} onClick={() => viewPart(part.id)}>
                      <div>
                        <div style={styles.listItemCode}>{part.partNumber}</div>
                        <div style={styles.listItemName}>{part.normalizedName}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold' }}>₹{part.mrp}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Location: {part.rackLocation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Indian Two-Wheeler Brands Lookup Portal */}
            <div>
              <h3 style={styles.sectionTitle}>Supported Brands</h3>
              <div style={styles.brandsGrid}>
                {brands.map(brand => {
                  const brandModels = models.filter(m => m.brand_id === brand.id || (m.brand && m.brand.id === brand.id));
                  return (
                    <div key={brand.id} className="glass-card" style={styles.brandCard} onClick={() => { setFilterModel(''); setSearchQuery(''); setActiveTab('search'); }}>
                      <Globe size={20} color="var(--accent-primary)" />
                      <h4 style={styles.brandName}>{brand.name}</h4>
                      <p style={styles.brandDesc}>{brandModels.length} compatible models</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB: UNIVERSAL CATALOG SEARCH */}
        {activeTab === 'search' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={styles.tabTitle}>Universal Search & Compatibility Directory</h2>

            {/* Universal Filters Panel */}
            <div className="glass-card" style={styles.filterBar}>
              <div style={styles.searchBox}>
                <Search size={18} color="var(--text-secondary)" />
                <input 
                  type="text" 
                  value={searchQuery}
                  placeholder="Search Part #, Description, Category, or compatibility keywords..." 
                  style={styles.filterInput}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={startVoiceSearch} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Mic size={16} color={isListening ? 'var(--danger)' : 'var(--text-secondary)'} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={styles.selectInput}>
                  <option value="">All Systems</option>
                  {systems.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>

                <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} style={styles.selectInput}>
                  <option value="">All Vehicles</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.family} - {m.name} ({m.year})</option>)}
                </select>

                <select value={filterIsKit} onChange={(e) => setFilterIsKit(e.target.value)} style={styles.selectInput}>
                  <option value="all">Kits & Spares</option>
                  <option value="kits">Kits & Assemblies Only</option>
                  <option value="parts">Individual Components Only</option>
                </select>

                {(searchQuery || filterCategory || filterModel || filterIsKit !== 'all') && (
                  <button onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterModel(''); setFilterIsKit('all'); }} style={styles.clearBtn}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Results Output grid */}
            <div style={styles.resultsCount}>
              Found {filteredPartsList.length} matching items in the active parts catalog
            </div>

            <div style={styles.partsGrid}>
              {filteredPartsList.length === 0 ? (
                <div style={styles.noResults}>
                  <AlertTriangle size={36} color="var(--text-muted)" />
                  <h3>No Match Located</h3>
                  <p>Check the spellings or select a different motorcycle filter compatibility.</p>
                </div>
              ) : (
                filteredPartsList.map(part => {
                  const compModels = localCatalog.compatibility
                    ?.filter(c => c.part_id === part.id)
                    ?.map(c => models.find(m => m.id === c.model_id))
                    ?.filter(Boolean) || [];

                  return (
                    <div key={part.id} className="glass-card" style={styles.partCard} onClick={() => viewPart(part.id)}>
                      <div style={styles.partCardHeader}>
                        <span style={styles.partCardNumber}>{part.partNumber}</span>
                        {part.isKit && <span style={styles.kitTypeBadge}>KIT</span>}
                      </div>
                      
                      <h4 style={styles.partCardName}>{part.normalizedName}</h4>
                      
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <strong>Sub-System:</strong> {part.subSystem || 'General'}
                      </div>

                      {/* Display compatible models */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                        {compModels.slice(0, 3).map(m => (
                          <span key={m.id} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            {m.name}
                          </span>
                        ))}
                        {compModels.length > 3 && <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)' }}>+{compModels.length - 3} more</span>}
                      </div>
                      
                      <div style={styles.partCardMeta}>
                        <span className={`badge-category cat-${part.category.toLowerCase().replace(/[^a-z]/g, '')}`}>
                          {part.category}
                        </span>
                        <span style={styles.mrpLabel}>MRP: ₹{part.mrp}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* TAB: EXPLODED DIAGRAM SYSTEM */}
        {activeTab === 'diagram' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={styles.tabTitle}>Interactive Exploded SVG Catalogue Diagrams</h2>
              <select 
                value={selectedDiagramId} 
                onChange={(e) => setSelectedDiagramId(Number(e.target.value))}
                style={styles.selectInput}
              >
                {diagrams.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.diagramGridContainer}>
              
              {/* SVG Diagram Canvas */}
              <div className="glass-card" style={styles.svgCanvasCard}>
                <div style={styles.svgHeaderBar}>
                  <span>Click diagram hotspot numbers to inspect matched component.</span>
                  {selectedHotspot && (
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                      Selected Hotspot: #{selectedHotspot}
                    </span>
                  )}
                </div>
                
                <div 
                  style={styles.svgWrapper}
                  onClick={(e) => {
                    const textNode = e.target.closest('text');
                    const circleNode = e.target.closest('circle');
                    if (textNode) {
                      const num = parseInt(textNode.textContent);
                      if (!isNaN(num)) handleHotspotClick(num);
                    } else if (circleNode) {
                      // fallback check text around it or highlight
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: activeDiagram?.svgData || '' }}
                />
              </div>

              {/* Sync Part Table List */}
              <div className="glass-card" style={styles.syncTableCard}>
                <h3 style={styles.sectionTitle}>Diagram Assembly Parts List</h3>
                <div style={styles.tableWrapper}>
                  <table style={styles.syncTable}>
                    <thead>
                      <tr>
                        <th>Spot</th>
                        <th>Part Number</th>
                        <th>Part Name</th>
                        <th>MRP</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDiagramParts.map(p => {
                        const isSelected = p.hotspotNumber === selectedHotspot;
                        return (
                          <tr 
                            key={p.id} 
                            style={{ 
                              ...styles.tableRow, 
                              ...(isSelected ? styles.tableRowSelected : {})
                            }}
                            onClick={() => { setSelectedHotspot(p.hotspotNumber); viewPart(p.id); }}
                          >
                            <td>
                              <span style={{ ...styles.spotBadge, background: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)' }}>
                                {p.hotspotNumber}
                              </span>
                            </td>
                            <td style={styles.tablePartNo}>{p.partNumber}</td>
                            <td style={styles.tablePartName}>{p.normalizedName}</td>
                            <td>₹{p.mrp}</td>
                            <td>{p.quantity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: SYSTEMS EXPLORER */}
        {activeTab === 'systems' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={styles.tabTitle}>Systems Explorer Directory</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '-15px' }}>
              Browse through components grouped by mechanical and structural categories.
            </p>

            <div style={styles.systemExplorerContainer}>
              <div style={styles.systemExplorerList}>
                {systems.map(sys => {
                  const isActive = filterCategory === sys.name;
                  return (
                    <div 
                      key={sys.id} 
                      className="glass-card" 
                      style={{ ...styles.systemExplorerItem, ...(isActive ? styles.systemExplorerItemActive : {}) }}
                      onClick={() => setFilterCategory(sys.name)}
                    >
                      <Cpu size={18} color={isActive ? "#ffffff" : "var(--accent-primary)"} />
                      <div>
                        <div style={styles.systemItemTitle}>{sys.name}</div>
                        <div style={styles.systemItemCount}>
                          {parts.filter(p => p.category === sys.name).length} catalog parts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="glass-card" style={styles.systemExplorerDetails}>
                {filterCategory === '' ? (
                  <div style={styles.noSystemSelected}>
                    <Layers size={36} color="var(--text-muted)" />
                    <h3>Select a system on the left</h3>
                    <p>Select a motorcycle assembly classification system to browse components.</p>
                  </div>
                ) : (
                  <div>
                    <div style={styles.systemDetailsHeader}>
                      <h3 style={styles.systemDetailsTitle}>{filterCategory} Category</h3>
                      <p style={styles.systemDetailsDesc}>
                        {systems.find(s => s.name === filterCategory)?.description}
                      </p>
                    </div>

                    <div style={styles.systemPartsList}>
                      {parts.filter(p => p.category === filterCategory).map(part => (
                        <div key={part.id} style={styles.systemPartItem} onClick={() => viewPart(part.id)}>
                          <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                            <span style={styles.systemPartNo}>{part.partNumber}</span>
                            <span style={styles.systemPartName}>{part.normalizedName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={styles.systemPartMrp}>₹{part.mrp}</span>
                            {part.isKit && <span style={styles.kitTypeBadge}>ASSEMBLY KIT</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: KNOWLEDGE RELATIONSHIPS GRAPH */}
        {activeTab === 'graph' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={styles.tabTitle}>Hierarchical Relationship Engine</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '-15px' }}>
              Trace parts through the vehicle hierarchy: Brand → Family → Model → System → Sub-System → Diagram → Part.
            </p>

            <div style={styles.graphLayout}>
              
              {/* Node selector sidebar */}
              <div className="glass-card" style={styles.graphSidebar}>
                <h3 style={styles.graphSidebarTitle}>Select Part Node</h3>
                <div style={styles.graphSearchBox}>
                  <Search size={16} color="var(--text-secondary)" />
                  <input 
                    type="text" 
                    placeholder="Search node name..." 
                    style={styles.graphSearchInput}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={styles.graphNodesList}>
                  {filteredPartsList.map(p => (
                    <div 
                      key={p.id} 
                      style={{ ...styles.graphNodeListItem, ...(selectedPartId === p.id ? styles.graphNodeListItemActive : {}) }}
                      onClick={() => setSelectedPartId(p.id)}
                    >
                      <Hash size={12} color="var(--text-secondary)" />
                      <div style={styles.graphNodeListItemText}>{p.normalizedName}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic hierarchical node tree */}
              <div className="glass-card" style={styles.graphCanvas}>
                {selectedPartId === null ? (
                  <div style={styles.graphCanvasEmpty}>
                    <GitFork size={36} color="var(--text-muted)" />
                    <h3>No Node Selected</h3>
                    <p>Select any part component from the sidebar list to inspect its hierarchical path.</p>
                  </div>
                ) : (
                  <div>
                    <div style={styles.nodeTreeGrid}>
                      
                      {/* Brand Node */}
                      <div style={styles.nodeCard}>
                        <div style={styles.nodeLabel}>Brand</div>
                        <div style={styles.nodeValue}>Hero / Honda / Bajaj</div>
                      </div>

                      <div style={styles.connectorRight} />

                      {/* Model Family Node */}
                      <div style={styles.nodeCard}>
                        <div style={styles.nodeLabel}>Model Family</div>
                        <div style={styles.nodeValue}>
                          {partDetails?.compatibleModels?.[0]?.family || 'Commuter Series'}
                        </div>
                      </div>

                      <div style={styles.connectorRight} />

                      {/* System Node */}
                      <div style={styles.nodeCard}>
                        <div style={styles.nodeLabel}>System Category</div>
                        <div style={styles.nodeValue}>{partDetails?.category}</div>
                      </div>

                      <div style={styles.connectorRight} />

                      {/* Active Part Node */}
                      <div style={{ ...styles.nodeCard, borderColor: 'var(--accent-primary)', background: 'rgba(99,102,241,0.08)' }}>
                        <div style={{ ...styles.nodeLabel, color: 'var(--accent-primary)' }}>Part Component</div>
                        <div style={styles.nodeValue}>{partDetails?.normalizedName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{partDetails?.partNumber}</div>
                      </div>

                    </div>

                    <div style={styles.graphDetailsCard}>
                      <h3>Node Specifications</h3>
                      <div style={styles.graphMetaGrid}>
                        <div>
                          <span style={styles.graphMetaLabel}>Part Number:</span>
                          <span style={styles.graphMetaVal}>{partDetails?.partNumber}</span>
                        </div>
                        <div>
                          <span style={styles.graphMetaLabel}>OEM Code:</span>
                          <span style={styles.graphMetaVal}>{partDetails?.oemNumber || 'OEM-SPK-31917'}</span>
                        </div>
                        <div>
                          <span style={styles.graphMetaLabel}>Rack Location:</span>
                          <span style={styles.graphMetaVal}>{partDetails?.rackLocation}</span>
                        </div>
                        <div>
                          <span style={styles.graphMetaLabel}>MRP Rate:</span>
                          <span style={styles.graphMetaVal}>₹{partDetails?.mrp}</span>
                        </div>
                      </div>

                      <button onClick={() => viewPart(selectedPartId)} style={styles.graphViewDetailsBtn}>
                        Go to Detailed Specification Sheet
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB: PART DETAIL PAGE */}
        {activeTab === 'part-detail' && partDetails && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <button onClick={() => setActiveTab('search')} style={styles.backButton}>
              <ArrowLeft size={16} /> Back to Catalog Search
            </button>

            <div style={styles.detailLayout}>
              
              {/* Left specifications pane */}
              <div className="glass-card" style={styles.detailMainCard}>
                <div style={styles.detailHeader}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={styles.detailPartNo}>{partDetails.partNumber}</span>
                    {partDetails.isKit && <span style={styles.kitTypeBadge}>ASSEMBLY KIT</span>}
                  </div>
                  <h2 style={styles.detailName}>{partDetails.normalizedName}</h2>
                  <div style={{ marginTop: '8px' }}>
                    <span className={`badge-category cat-${partDetails.category.toLowerCase().replace(/[^a-z]/g, '')}`}>
                      {partDetails.category}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                      <strong>Sub-System:</strong> {partDetails.subSystem || 'General Assembly'}
                    </span>
                  </div>
                </div>

                <div style={styles.detailsSpecsGrid}>
                  <div style={styles.specItem}>
                    <DollarSign size={18} color="var(--accent-primary)" />
                    <div>
                      <div style={styles.specLabel}>MRP PRICE</div>
                      <div style={styles.specVal}>₹{partDetails.mrp}</div>
                    </div>
                  </div>

                  <div style={styles.specItem}>
                    <Package size={18} color="var(--success)" />
                    <div>
                      <div style={styles.specLabel}>CURRENT STOCK</div>
                      <div style={styles.specVal}>{partDetails.quantity} units</div>
                    </div>
                  </div>

                  <div style={styles.specItem}>
                    <ShieldCheck size={18} color="var(--accent-secondary)" />
                    <div>
                      <div style={styles.specLabel}>RACK LOCATION</div>
                      <div style={styles.specVal}>{partDetails.rackLocation}</div>
                    </div>
                  </div>
                </div>

                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>OEM Specifications & Description</h3>
                  <p style={styles.detailDescText}>{partDetails.description || 'Genuine replacement motorcycle component built to precise specifications.'}</p>
                </div>

                {/* Inventory Costings integration panel */}
                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>Inventory & Costing Metrics</h3>
                  <div style={styles.costingGrid}>
                    <div style={styles.costCard}>
                      <span style={styles.costLabel}>Dealer Price (excl. tax)</span>
                      <span style={styles.costVal}>₹{partDetails.dealerPrice || (partDetails.mrp * 0.85).toFixed(2)}</span>
                    </div>
                    <div style={styles.costCard}>
                      <span style={styles.costLabel}>Last Purchase Price</span>
                      <span style={styles.costVal}>₹{partDetails.lastPurchasePrice || (partDetails.mrp * 0.75).toFixed(2)}</span>
                    </div>
                    <div style={styles.costCard}>
                      <span style={styles.costLabel}>Reorder Threshold</span>
                      <span style={styles.costVal}>{partDetails.reorderLevel || 5} units</span>
                    </div>
                    <div style={styles.costCard}>
                      <span style={styles.costLabel}>Supplier</span>
                      <span style={styles.costVal}>{partDetails.supplier || 'OEM Direct'}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>Model Compatibility Mapping</h3>
                  <div style={styles.modelsContainer}>
                    {partDetails.compatibleModels.length === 0 ? (
                      <p style={styles.emptyText}>Broadly compatible with standard commuter families.</p>
                    ) : (
                      partDetails.compatibleModels.map(m => (
                        <span key={m.id} style={styles.modelBadge}>
                          {m.family} - {m.name} ({m.year})
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right relationships sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* SVG diagram link */}
                {partDetails.diagramInfo && (
                  <div className="glass-card" style={styles.relationCard}>
                    <h3 style={styles.detailSectionTitle}>Diagram Location</h3>
                    <p style={styles.descLinkText}>This part is mapped to hotspot #{partDetails.hotspotNumber} inside: <strong>{partDetails.diagramInfo.name}</strong></p>
                    <button onClick={() => { setSelectedDiagramId(partDetails.diagram_id); setSelectedHotspot(partDetails.hotspotNumber); setActiveTab('diagram'); }} style={styles.viewKitBreakdownBtn}>
                      <Layers size={14} /> Open Exploded Diagram View
                    </button>
                  </div>
                )}

                {/* Sibling and cross-references */}
                {partDetails.alternatives && (
                  <div className="glass-card" style={styles.relationCard}>
                    <h3 style={styles.detailSectionTitle}>Cross-Compatible Alternatives</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                      {partDetails.alternatives.split(',').map((alt, idx) => (
                        <span key={idx} style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.08)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '0.85rem' }}>
                          {alt.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kits relationship */}
                {partDetails.parentKits.length > 0 && (
                  <div className="glass-card" style={styles.relationCard}>
                    <h3 style={styles.detailSectionTitle}>Part of Assembly Kit</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      {partDetails.parentKits.map(({ kit, quantity }) => (
                        <div key={kit.id} style={styles.parentKitRow} onClick={() => viewPart(kit.part_id)}>
                          <div>
                            <div style={styles.parentKitNo}>{kit.kitNumber}</div>
                            <div style={styles.parentKitName}>{kit.name}</div>
                          </div>
                          <span style={styles.parentKitQty}>Qty: {quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Child parts if it is a kit */}
                {partDetails.childParts.length > 0 && (
                  <div className="glass-card" style={styles.relationCard}>
                    <h3 style={styles.detailSectionTitle}>Child Components in Kit</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      {partDetails.childParts.map(({ part, quantity }) => (
                        <div key={part.id} style={styles.parentKitRow} onClick={() => viewPart(part.id)}>
                          <div>
                            <div style={styles.parentKitNo}>{part.partNumber}</div>
                            <div style={styles.parentKitName}>{part.normalizedName}</div>
                          </div>
                          <span style={styles.parentKitQty}>x{quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related parts */}
                <div className="glass-card" style={styles.relationCard}>
                  <h3 style={styles.detailSectionTitle}>Related Components</h3>
                  <div style={styles.relatedGrid}>
                    {relatedParts.map(rp => (
                      <div key={rp.id} style={styles.relatedMiniItem} onClick={() => viewPart(rp.id)}>
                        <div style={styles.relatedMiniNo}>{rp.partNumber}</div>
                        <div style={styles.relatedMiniName}>{rp.normalizedName}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB: AI CHAT ASSISTANT */}
        {activeTab === 'assistant' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={styles.tabTitle}>AI Parts Knowledge Assistant</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '-15px' }}>
              Query the platform's knowledge graph directly using natural language prompts.
            </p>

            <div className="glass-card" style={styles.chatConsole}>
              <div style={styles.chatHistory}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} style={{ ...styles.chatBubble, alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', background: msg.sender === 'user' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.75rem', color: msg.sender === 'user' ? 'rgba(255,255,255,0.8)' : 'var(--accent-primary)', marginBottom: '4px' }}>
                      {msg.sender === 'user' ? 'USER' : 'MOTO INTEL AI'}
                    </div>
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{msg.text}</div>
                    
                    {/* Render matching interactive part cards inside chat */}
                    {msg.items && msg.items.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                        {msg.items.map(part => (
                          <div key={part.id} style={styles.chatPartCard} onClick={() => viewPart(part.id)}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{part.partNumber}</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{part.normalizedName}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>₹{part.mrp}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock: {part.quantity}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={styles.chatInputRow}>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                  placeholder="Ask a question (e.g. 'Show clutch plates for Splendor')"
                  style={styles.chatInputField}
                />
                <button onClick={handleSendChat} style={styles.btnPrimary}>
                  Send Query
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: OCR PART SCANNER */}
        {activeTab === 'ocr' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={styles.tabTitle}>OCR OEM Label & Packaging Scanner</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '-15px' }}>
              Simulate label text extraction using high-fidelity optical character recognition.
            </p>

            <div className="glass-card" style={{ padding: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              
              <div style={styles.scannerZone}>
                <ImageIcon size={48} color="var(--text-muted)" />
                <div style={{ marginTop: '12px', fontWeight: 'bold' }}>Drag & Drop OEM Label Photo</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Supports JPG, PNG packaging labels up to 5MB</div>
              </div>

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button onClick={() => simulateOcrScanner('spark')} style={{ ...styles.btnSecondary, flex: 1 }}>
                  Scan Spark Plug Label
                </button>
                <button onClick={() => simulateOcrScanner('chain')} style={{ ...styles.btnSecondary, flex: 1 }}>
                  Scan Chain Box Label
                </button>
                <button onClick={() => simulateOcrScanner('clutch')} style={{ ...styles.btnSecondary, flex: 1 }}>
                  Scan Clutch Plate Kit
                </button>
              </div>

              {isOcrScanning && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                  <RefreshCw size={24} className="spin" color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Processing OCR algorithms...</span>
                </div>
              )}

              {ocrResult && (
                <div className="glass-card" style={styles.ocrResultCard}>
                  <h3 style={{ ...styles.sectionTitle, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={18} /> OCR Extracted Successfully ({ocrResult.confidence})
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IDENTIFIED PART NUMBER</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
                        {ocrResult.partNumber}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        OEM Part: {ocrResult.oemNumber}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const matched = parts.find(p => p.partNumber === ocrResult.partNumber);
                        if (matched) viewPart(matched.id);
                        else alert('Part matched text but was not found in catalog.');
                      }} 
                      style={styles.btnPrimary}
                    >
                      Inspect Part details
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB: ADMIN CONSOLE */}
        {activeTab === 'admin' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={styles.tabTitle}>OEM Administration & Inventory Console</h2>
            
            <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <button onClick={() => setAdminSection('parts')} style={{ ...styles.clearBtn, color: adminSection === 'parts' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                Parts Inventory CRUD
              </button>
            </div>

            {adminSection === 'parts' && (
              <div style={styles.detailLayout}>
                
                {/* Save/Edit Form */}
                <div className="glass-card" style={{ padding: '28px' }}>
                  <h3 style={styles.sectionTitle}>{editingPartId ? 'Edit Part Record' : 'Create New Part Entry'}</h3>
                  <form onSubmit={handleSavePart} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                    
                    <div style={styles.formGroup}>
                      <label>Part Number</label>
                      <input 
                        type="text" 
                        required
                        value={adminPartForm.partNumber}
                        onChange={(e) => setAdminPartForm({...adminPartForm, partNumber: e.target.value})}
                        style={styles.adminInput} 
                        placeholder="e.g. 31917-AAC-H00" 
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>Part Name (OEM)</label>
                      <input 
                        type="text" 
                        required
                        value={adminPartForm.name}
                        onChange={(e) => setAdminPartForm({...adminPartForm, name: e.target.value})}
                        style={styles.adminInput} 
                        placeholder="e.g. SPARK PLUG (NGK)" 
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>Normalized Display Name</label>
                      <input 
                        type="text" 
                        required
                        value={adminPartForm.normalizedName}
                        onChange={(e) => setAdminPartForm({...adminPartForm, normalizedName: e.target.value})}
                        style={styles.adminInput} 
                        placeholder="e.g. Spark Plug" 
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label>System Category</label>
                      <select 
                        value={adminPartForm.category}
                        onChange={(e) => setAdminPartForm({...adminPartForm, category: e.target.value})}
                        style={styles.adminSelect}
                      >
                        {systems.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label>MRP Rate (₹)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={adminPartForm.mrp}
                          onChange={(e) => setAdminPartForm({...adminPartForm, mrp: e.target.value})}
                          style={styles.adminInput} 
                        />
                      </div>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label>Initial Stock</label>
                        <input 
                          type="number" 
                          required
                          value={adminPartForm.quantity}
                          onChange={(e) => setAdminPartForm({...adminPartForm, quantity: e.target.value})}
                          style={styles.adminInput} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label>Rack Location</label>
                        <input 
                          type="text" 
                          value={adminPartForm.rackLocation}
                          onChange={(e) => setAdminPartForm({...adminPartForm, rackLocation: e.target.value})}
                          style={styles.adminInput} 
                        />
                      </div>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label>Reorder Level</label>
                        <input 
                          type="number" 
                          value={adminPartForm.reorderLevel}
                          onChange={(e) => setAdminPartForm({...adminPartForm, reorderLevel: e.target.value})}
                          style={styles.adminInput} 
                        />
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label>Supplier Description</label>
                      <input 
                        type="text" 
                        value={adminPartForm.supplier}
                        onChange={(e) => setAdminPartForm({...adminPartForm, supplier: e.target.value})}
                        style={styles.adminInput} 
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="submit" style={{ ...styles.btnPrimary, flex: 1 }}>
                        {editingPartId ? 'Update Record' : 'Add Component'}
                      </button>
                      {editingPartId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingPartId(null);
                            setAdminPartForm({
                              partNumber: '', name: '', normalizedName: '', category: 'Electrical',
                              mrp: 0.0, quantity: 1, isKit: false, description: '', oemNumber: '',
                              rackLocation: 'RACK-A1', reorderLevel: 5, supplier: 'OEM Direct'
                            });
                          }}
                          style={{ ...styles.btnSecondary }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Active Parts Catalog List */}
                <div className="glass-card" style={{ padding: '28px' }}>
                  <h3 style={styles.sectionTitle}>Parts Master Listing</h3>
                  <div style={{ ...styles.tableWrapper, maxHeight: '500px', overflowY: 'auto', marginTop: '16px' }}>
                    <table style={styles.syncTable}>
                      <thead>
                        <tr>
                          <th>Part Number</th>
                          <th>Normalized Name</th>
                          <th>Category</th>
                          <th>MRP</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parts.map(p => (
                          <tr key={p.id}>
                            <td>{p.partNumber}</td>
                            <td>{p.normalizedName}</td>
                            <td>{p.category}</td>
                            <td>₹{p.mrp}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  onClick={() => {
                                    setEditingPartId(p.id);
                                    setAdminPartForm({
                                      partNumber: p.partNumber, name: p.name, normalizedName: p.normalizedName,
                                      category: p.category, mrp: p.mrp, quantity: p.quantity, isKit: p.isKit,
                                      description: p.description, oemNumber: p.oemNumber, rackLocation: p.rackLocation,
                                      reorderLevel: p.reorderLevel, supplier: p.supplier
                                    });
                                  }}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)' }}
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePart(p.id)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

// Full styled CSS object system
const styles = {
  sidebar: {
    width: '280px',
    background: 'var(--bg-dark)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 20px',
    position: 'sticky',
    top: 0,
    height: '100vh',
    flexShrink: 0
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
    padding: '0 4px'
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)'
  },
  logoText: {
    fontSize: '1.2rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
    color: '#ffffff',
    lineHeight: '1.1'
  },
  logoSubText: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: 'var(--accent-primary)',
    letterSpacing: '0.1em'
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontWeight: '500',
    fontSize: '0.95rem',
    textAlign: 'left',
    transition: 'all 0.2s ease'
  },
  navItemActive: {
    color: '#ffffff',
    background: 'rgba(255,255,255,0.06)',
    boxShadow: 'inset 4px 0 0 0 var(--accent-primary)',
    paddingLeft: '20px'
  },
  sidebarFooter: {
    paddingTop: '20px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '6px',
    letterSpacing: '0.05em'
  },
  footerInfo: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: '1.5'
  },
  mainContainer: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto',
    maxHeight: '100vh'
  },
  tabTitle: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: '10px'
  },
  heroBanner: {
    background: 'radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.05) 50%, transparent 100%), var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '40px',
    boxShadow: 'var(--shadow-md)'
  },
  badgePremium: {
    fontSize: '0.7rem',
    fontWeight: '800',
    color: 'var(--accent-primary)',
    background: 'rgba(99, 102, 241, 0.1)',
    padding: '4px 10px',
    borderRadius: '9999px',
    width: 'fit-content',
    marginBottom: '12px',
    letterSpacing: '0.05em'
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: '12px',
    lineHeight: '1.2'
  },
  heroSub: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    maxWidth: '600px',
    marginBottom: '24px'
  },
  heroSearchContainer: {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    padding: '4px 16px',
    width: '400px',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
  },
  heroSearchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    padding: '12px',
    fontSize: '0.95rem',
    width: '100%',
    fontFamily: 'var(--font-body)'
  },
  statsPanelRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '220px'
  },
  statMiniBox: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    padding: '16px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  statVal: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#ffffff'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center'
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px'
  },
  listSection: {
    padding: '28px'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '10px'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  listItemCode: {
    fontSize: '0.75rem',
    color: 'var(--accent-primary)',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  listItemName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#ffffff',
    marginTop: '2px'
  },
  brandsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
    marginTop: '15px'
  },
  brandCard: {
    padding: '20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  brandName: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#ffffff'
  },
  brandDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  filterBar: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(15,23,42,0.4)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 14px',
    flex: 1,
    minWidth: '260px'
  },
  filterInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: '0.9rem',
    width: '100%',
    fontFamily: 'var(--font-body)'
  },
  selectInput: {
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '10px 14px',
    outline: 'none',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0 10px',
    fontFamily: 'var(--font-heading)',
    fontWeight: '600'
  },
  resultsCount: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  partsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  noResults: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 20px',
    color: 'var(--text-secondary)',
    textAlign: 'center'
  },
  partCard: {
    padding: '20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  partCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  partCardNumber: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--accent-primary)',
    letterSpacing: '0.05em'
  },
  kitTypeBadge: {
    background: 'var(--accent-gradient)',
    color: '#ffffff',
    fontSize: '0.65rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  partCardName: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: '1.4'
  },
  partCardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto'
  },
  mrpLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  diagramGridContainer: {
    display: 'grid',
    gridTemplateColumns: '3fr 2fr',
    gap: '30px'
  },
  svgCanvasCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  svgHeaderBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  svgWrapper: {
    background: 'rgba(15,23,42,0.4)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden'
  },
  syncTableCard: {
    padding: '24px'
  },
  tableWrapper: {
    marginTop: '15px'
  },
  syncTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.85rem'
  },
  tableRow: {
    borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  tableRowSelected: {
    background: 'rgba(99, 102, 241, 0.1)',
    borderLeft: '4px solid var(--accent-primary)'
  },
  tablePartNo: {
    color: 'var(--accent-primary)',
    fontWeight: 'bold'
  },
  tablePartName: {
    color: '#ffffff'
  },
  spotBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    fontWeight: 'bold',
    fontSize: '0.75rem',
    color: '#ffffff'
  },
  systemExplorerContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '30px',
    alignItems: 'start'
  },
  systemExplorerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  systemExplorerItem: {
    padding: '18px 20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  systemExplorerItemActive: {
    borderColor: 'var(--accent-primary)',
    background: 'var(--accent-gradient)',
    color: '#ffffff'
  },
  systemItemTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'inherit'
  },
  systemItemCount: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.6)',
    marginTop: '2px'
  },
  systemExplorerDetails: {
    padding: '36px'
  },
  noSystemSelected: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '80px 20px',
    color: 'var(--text-secondary)',
    textAlign: 'center'
  },
  systemDetailsHeader: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '20px',
    marginBottom: '20px'
  },
  systemDetailsTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#ffffff'
  },
  systemDetailsDesc: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginTop: '4px',
    lineHeight: '1.5'
  },
  systemPartsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  systemPartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  systemPartNo: {
    fontSize: '0.75rem',
    color: 'var(--accent-primary)',
    fontWeight: '700'
  },
  systemPartName: {
    fontSize: '0.9rem',
    color: '#ffffff',
    fontWeight: '600'
  },
  systemPartMrp: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  graphLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 2.5fr',
    gap: '30px',
    alignItems: 'start'
  },
  graphSidebar: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  graphSidebarTitle: {
    fontSize: '1rem',
    fontWeight: '700'
  },
  graphSearchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(15,23,42,0.4)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px'
  },
  graphSearchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: '0.85rem',
    width: '100%',
    fontFamily: 'var(--font-body)'
  },
  graphNodesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  graphNodeListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  graphNodeListItemActive: {
    borderColor: 'var(--accent-primary)',
    background: 'rgba(99, 102, 241, 0.1)'
  },
  graphNodeListItemText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  graphCanvas: {
    padding: '36px',
    minHeight: '450px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  graphCanvasEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '40px'
  },
  nodeTreeGrid: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '30px 0',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  nodeCard: {
    width: '170px',
    padding: '16px 12px',
    background: 'var(--bg-dark)',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    textAlign: 'center'
  },
  nodeLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  nodeValue: {
    fontSize: '0.85rem',
    fontWeight: '800',
    color: '#ffffff'
  },
  connectorRight: {
    width: '24px',
    height: '2px',
    background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))'
  },
  graphDetailsCard: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '20px'
  },
  graphMetaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    margin: '16px 0'
  },
  graphMetaLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginRight: '6px'
  },
  graphMetaVal: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#ffffff'
  },
  graphViewDetailsBtn: {
    background: 'var(--accent-gradient)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#ffffff',
    fontFamily: 'var(--font-heading)',
    fontWeight: '600',
    fontSize: '0.85rem',
    padding: '10px 20px',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s ease'
  },
  backButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    width: 'fit-content',
    transition: 'color 0.2s ease'
  },
  detailLayout: {
    display: 'grid',
    gridTemplateColumns: '3fr 2fr',
    gap: '30px'
  },
  detailMainCard: {
    padding: '36px'
  },
  detailHeader: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '24px',
    marginBottom: '24px'
  },
  detailPartNo: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: 'var(--accent-primary)',
    letterSpacing: '0.05em'
  },
  detailName: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#ffffff',
    marginTop: '6px',
    lineHeight: '1.2'
  },
  detailsSpecsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  specItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    padding: '16px',
    borderRadius: 'var(--radius-sm)'
  },
  specLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '2px'
  },
  specVal: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#ffffff'
  },
  detailSection: {
    marginBottom: '28px'
  },
  detailSectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
    marginBottom: '12px'
  },
  detailDescText: {
    color: 'var(--text-primary)',
    lineHeight: '1.6',
    fontSize: '0.95rem'
  },
  costingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '10px'
  },
  costCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  costLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)'
  },
  costVal: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#ffffff'
  },
  modelsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  modelBadge: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    padding: '6px 12px',
    borderRadius: '6px'
  },
  relationCard: {
    padding: '24px'
  },
  viewKitBreakdownBtn: {
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--accent-primary)',
    fontFamily: 'var(--font-heading)',
    fontWeight: '600',
    fontSize: '0.85rem',
    padding: '10px 16px',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
    marginTop: '12px'
  },
  parentKitRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  parentKitNo: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent-primary)'
  },
  parentKitName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#ffffff',
    marginTop: '2px'
  },
  parentKitQty: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  relatedGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '12px'
  },
  relatedMiniItem: {
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  relatedMiniNo: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)'
  },
  relatedMiniName: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#ffffff',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  chatConsole: {
    display: 'flex',
    flexDirection: 'column',
    height: '550px',
    padding: '24px'
  },
  chatHistory: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    paddingRight: '6px',
    marginBottom: '20px'
  },
  chatBubble: {
    padding: '14px 18px',
    borderRadius: '12px',
    maxWidth: '80%',
    display: 'flex',
    flexDirection: 'column'
  },
  chatInputRow: {
    display: 'flex',
    gap: '12px'
  },
  chatInputField: {
    flex: 1,
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '14px',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'var(--font-body)'
  },
  chatPartCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '6px'
  },
  scannerZone: {
    width: '100%',
    height: '200px',
    border: '2px dashed var(--border-color)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.01)',
    transition: 'all 0.2s ease'
  },
  ocrResultCard: {
    width: '100%',
    padding: '20px',
    borderColor: 'var(--success)',
    background: 'rgba(16,185,129,0.02)'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  adminInput: {
    width: '100%',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '10px 14px',
    fontSize: '0.9rem',
    outline: 'none'
  },
  adminSelect: {
    width: '100%',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '10px 14px',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(11, 15, 25, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'start',
    justifyContent: 'center',
    paddingTop: '100px',
    zIndex: 999
  },
  commandPaletteCard: {
    background: 'var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    width: '600px',
    boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
    overflow: 'hidden'
  },
  commandHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)'
  },
  commandInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: '1rem',
    fontFamily: 'var(--font-body)'
  },
  commandList: {
    padding: '12px 8px',
    maxHeight: '350px',
    overflowY: 'auto'
  },
  commandLabel: {
    fontSize: '0.65rem',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    padding: '6px 12px'
  },
  commandItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  descLinkText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5'
  },
  btnPrimary: {
    background: 'var(--accent-gradient)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontWeight: '600',
    padding: '12px 24px',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
  },
  btnSecondary: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-heading)',
    fontWeight: '600',
    padding: '12px 24px',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  brandsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
    marginTop: '15px'
  },
  brandCard: {
    padding: '20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  brandName: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#ffffff'
  },
  brandDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  }
};
