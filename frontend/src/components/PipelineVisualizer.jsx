import React from 'react';
import { Search, Database, Network, ShieldCheck, BookOpen, BrainCircuit } from 'lucide-react';

export default function PipelineVisualizer({ currentStep = 0, isRunning = false }) {
  const steps = [
    { num: 'Step 1', title: 'Term Search', desc: 'Lexical & NAMASTE Index', icon: Search },
    { num: 'Step 2', title: 'Candidate Retrieval', desc: 'WHO ICD-11 Live Search', icon: Database },
    { num: 'Step 3', title: 'Knowledge Graph', desc: 'Symptom & Dosha Expansion', icon: Network },
    { num: 'Step 4', title: 'Rule Gate', desc: 'Deterministic Safety Check', icon: ShieldCheck },
    { num: 'Step 5', title: 'Evidence GraphRAG', desc: 'Provenance Literature Match', icon: BookOpen },
    { num: 'Step 6', title: 'Uncertainty Engine', desc: 'Multi-Signal Confidence', icon: BrainCircuit },
  ];

  return (
    <div className="pipeline-visualizer">
      {steps.map((step, idx) => {
        const IconComponent = step.icon;
        const isActive = isRunning && currentStep === idx;
        const isCompleted = currentStep > idx || (!isRunning && currentStep === steps.length - 1);

        return (
          <div 
            key={idx} 
            className={`pipeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
              <IconComponent size={14} color={isActive ? '#38bdf8' : isCompleted ? '#34d399' : '#94a3b8'} />
              <span className="step-num">{step.num}</span>
            </div>
            <div className="step-title">{step.title}</div>
            <div className="step-desc">{step.desc}</div>
          </div>
        );
      })}
    </div>
  );
}
