import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Stethoscope, FileJson, Activity, CheckCircle2, FlaskConical } from 'lucide-react';
import './index.css';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'review'
  
  // -- Search Tab State --
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [translations, setTranslations] = useState(null);
  
  const [patient, setPatient] = useState({
    first_name: 'Ram',
    last_name: 'Kumar',
    gender: 'male',
    birth_date: '1995-10-15'
  });
  
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transLoading, setTransLoading] = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);

  const [showFullBundle, setShowFullBundle] = useState(false);
  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.length < 2) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/terminology/search?q=${searchQuery}`);
      setResults(res.data);
      setSelectedTerm(null);
      setTranslations(null);
      setBundle(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectTerm = async (term) => {
    setSelectedTerm(term);
    setTransLoading(true);
    setBundle(null);
    
    try {
      const res = await axios.get(`${API_BASE}/mapping/translate?source_code=${term.code}`);
      setTranslations(res.data);
    } catch (err) {
      console.error(err);
      setTranslations([]); // Empty means no translation mapped
    } finally {
      setTransLoading(false);
    }
  };

  const generateBundle = async () => {
    if (!selectedTerm) return;
    setBundleLoading(true);
    try {
      const payload = {
        patient,
        namaste_code: selectedTerm.code,
        namaste_term: selectedTerm.term
      };
      const res = await axios.post(`${API_BASE}/fhir/generate-bundle`, payload);
      setBundle(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBundleLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1><Stethoscope size={32} style={{verticalAlign: 'bottom', marginRight: '8px'}}/> ClinBridge AI</h1>
        <p>Intelligent Translation from NAMASTE Ayurveda to WHO ICD-11 & FHIR</p>
        
        <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem'}}>
          <button 
            onClick={() => setActiveTab('search')} 
            style={{background: 'var(--accent-color)'}}>
            <Search size={18}/> Clinical Search
          </button>
        </div>
      </header>

      {activeTab === 'search' && (
        <main className="main-grid">
          {/* Left Column: Search & Translation */}
          <div className="glass-panel search-section">
            <h2>1. Search Diagnosis</h2>
            <form className="search-bar" onSubmit={handleSearch}>
              <input 
                type="text" 
                placeholder="Search NAMASTE codes (e.g., Jvara)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" disabled={loading}>
                {loading ? <div className="loading-spinner"/> : <Search size={20} />} Search
              </button>
            </form>

            <div className="results-list">
              {results.map((r) => (
                <div 
                  key={r.code} 
                  className={`result-item ${selectedTerm?.code === r.code ? 'selected' : ''}`}
                  onClick={() => selectTerm(r)}
                >
                  <span className="code-badge">{r.code}</span>
                  <h4>{r.term}</h4>
                  {r.definition && <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{r.definition}</p>}
                </div>
              ))}
            </div>

            {transLoading && <div style={{textAlign: 'center'}}><div className="loading-spinner"/> Translating to ICD-11...</div>}
            
            {selectedTerm && translations && (
              <div className="translations-box">
                <h3 style={{marginBottom: '0.5rem'}}><Activity size={18} style={{verticalAlign: 'bottom'}}/> ICD-11 Translations</h3>
                {translations.length === 0 ? (
                  <p style={{color: 'var(--text-secondary)'}}>No mappings available for this code.</p>
                ) : (
                  translations.map((t, idx) => {
                    let titleStr = t.icd11_title || 'Unknown Title';
                    
                    return (
                      <div key={idx} style={{marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: `4px solid ${t.confidence_level === 'HIGH_CONFIDENCE_MATCH' ? '#10b981' : t.confidence_level === 'PROBABLE_MATCH' ? '#f59e0b' : t.confidence_level === 'LOW_CONFIDENCE_MATCH' ? '#ef4444' : '#6b7280'}`}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <strong style={{fontSize: '1.1rem'}}>{t.icd11_code || 'NO_MATCH'}: {titleStr}</strong>
                          <span style={{padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)'}}>{t.confidence_level}</span>
                        </div>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '8px 0'}}>
                          URI: {t.icd11_uri || 'N/A'} <br/>
                          Relationship: {t.relationship_type} | Final Score: {(t.final_score * 100).toFixed(1)}% | Method: {t.mapping_method}
                        </div>
                        
                        <div style={{marginTop: '0.5rem', fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px'}}>
                          <div style={{color: '#94a3b8'}}><strong>Why this mapping?</strong></div><div></div>
                          <div>Lexical Score: {(t.lexical_score * 100).toFixed(1)}%</div>
                          <div>Synonym Score: {(t.synonym_score * 100).toFixed(1)}%</div>
                          <div>Translation Score: {(t.translation_score * 100).toFixed(1)}%</div>
                          <div>Definition Score: {(t.definition_score * 100).toFixed(1)}%</div>
                          <div>Clinical Score: {(t.clinical_score * 100).toFixed(1)}%</div>
                          <div>Semantic Score: {(t.semantic_score * 100).toFixed(1)}%</div>
                          <div>API Rank Score: {(t.api_rank_score * 100).toFixed(1)}%</div>
                          <div style={{color: '#ef4444'}}>Conflict Penalty: {(t.conflict_penalty * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right Column: Patient Data & Generation */}
          <div className="glass-panel patient-section">
            <h2>2. Patient Details</h2>
            <div className="form-grid">
              <input 
                type="text" 
                placeholder="First Name" 
                value={patient.first_name}
                onChange={(e) => setPatient({...patient, first_name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                value={patient.last_name}
                onChange={(e) => setPatient({...patient, last_name: e.target.value})}
              />
              <select 
                value={patient.gender} 
                onChange={(e) => setPatient({...patient, gender: e.target.value})}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input 
                type="date" 
                value={patient.birth_date}
                onChange={(e) => setPatient({...patient, birth_date: e.target.value})}
              />
            </div>

            <button 
              onClick={generateBundle} 
              disabled={!selectedTerm || bundleLoading}
              style={{marginTop: '1rem', width: '100%', padding: '1rem'}}
            >
              {bundleLoading ? <div className="loading-spinner"/> : <FileJson size={20}/>} 
              Generate FHIR Bundle
            </button>
          </div>

          {/* Full Width: FHIR Output */}
          {bundle && (
            <div className="glass-panel bundle-viewer" style={{marginTop: '2rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <h2 style={{color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0}}>
                  <CheckCircle2 size={24}/> FHIR Transaction Bundle Generated
                </h2>
                <button 
                  onClick={() => setShowFullBundle(!showFullBundle)}
                  style={{padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', color: 'white'}}
                >
                  {showFullBundle ? 'Hide Full Details' : 'View Full Details'}
                </button>
              </div>

              {!showFullBundle ? (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px'}}>
                  <div>
                    <h3 style={{color: '#93c5fd', marginBottom: '0.5rem'}}>Patient Information</h3>
                    <p><strong>Name:</strong> {patient.first_name} {patient.last_name}</p>
                    <p><strong>Gender:</strong> {patient.gender}</p>
                    <p><strong>DOB:</strong> {patient.birth_date}</p>
                  </div>
                  <div>
                    <h3 style={{color: '#93c5fd', marginBottom: '0.5rem'}}>Condition Mapping</h3>
                    <p><strong>Source (NAMASTE):</strong> {selectedTerm?.code} - {selectedTerm?.term}</p>
                    {translations && translations.length > 0 && (
                      <p><strong>Target (ICD-11):</strong> {translations[0].icd11_code} ({translations[0].icd11_title})</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="json-block" style={{marginTop: '1rem'}}>
                  <pre>{JSON.stringify(bundle, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </main>
      )}


    </div>
  );
}

export default App;
