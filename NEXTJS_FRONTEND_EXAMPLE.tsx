'use client'

import { useState } from 'react'

type DiagnosisMode = 'rules' | 'rag' | 'hybrid'

interface DiagnosisResponse {
  mode: string
  rule_matches?: Array<{
    name: string
    severity: string
    emergency: boolean
    explanation: string
  }>
  retrieved?: Array<{
    score: number
    text: string
  }>
  llm_summary?: string
  matches?: Array<{
    name: string
    severity: string
    emergency: boolean
    explanation: string
  }>
}

interface SymptomsData {
  symptoms: Record<string, boolean>
  text?: string
  mode: DiagnosisMode
}

const AVAILABLE_SYMPTOMS = [
  'fever', 'cough', 'sore_throat', 'chills', 'sweating', 'headache',
  'body_pain', 'runny_nose', 'nausea', 'vomiting', 'abdominal_pain',
  'shortness_breath', 'chest_pain', 'fatigue'
]

export default function MedicalDiagnosis() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, boolean>>({})
  const [userText, setUserText] = useState('')
  const [mode, setMode] = useState<DiagnosisMode>('hybrid')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosisResponse | null>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev => ({
      ...prev,
      [symptom]: !prev[symptom]
    }))
  }

  const handleDiagnose = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const payload: SymptomsData = {
        symptoms: selectedSymptoms,
        text: userText,
        mode
      }

      const response = await fetch(`${API_URL}/diagnose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: DiagnosisResponse = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const hasSelectedSymptoms = Object.values(selectedSymptoms).some(Boolean)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Medical Diagnosis System</h1>
      <p className="text-gray-600 mb-6">
        Disclaimer: This is a prototype only. Not medical advice. Consult a professional.
      </p>

      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">Diagnosis Mode</label>
        <div className="flex gap-4">
          {(['rules', 'rag', 'hybrid'] as DiagnosisMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded capitalize ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {m === 'hybrid' ? 'Hybrid (Rule+RAG+LLM)' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-lg font-semibold mb-3">Select Symptoms</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {AVAILABLE_SYMPTOMS.map((symptom) => (
            <label key={symptom} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSymptoms[symptom] || false}
                onChange={() => handleSymptomToggle(symptom)}
                className="w-4 h-4"
              />
              <span className="capitalize">{symptom.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {(mode === 'rag' || mode === 'hybrid') && (
        <div className="mb-6">
          <label className="block text-lg font-semibold mb-2">
            Describe symptoms in your own words (optional)
          </label>
          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="e.g., I have a severe headache and feel dizzy..."
            className="w-full p-3 border border-gray-300 rounded-lg min-h-[100px]"
          />
        </div>
      )}

      <button
        onClick={handleDiagnose}
        disabled={!hasSelectedSymptoms || loading}
        className={`w-full py-3 rounded-lg font-semibold text-white ${
          !hasSelectedSymptoms || loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? 'Analyzing...' : 'Run Diagnosis'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          {mode === 'hybrid' || mode === 'rules' ? (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-3">Rule-Based Matches</h2>
              {result.rule_matches && result.rule_matches.length > 0 ? (
                result.rule_matches.map((match, idx) => (
                  <div key={idx} className="mb-4 p-3 bg-white rounded border">
                    <h3 className="font-bold text-lg">{match.name}</h3>
                    <p className="text-sm">
                      <span className="font-semibold">Severity:</span> {match.severity} |{' '}
                      <span className="font-semibold">Emergency:</span>{' '}
                      {match.emergency ? 'Yes' : 'No'}
                    </p>
                    <p className="mt-2 text-gray-700">{match.explanation}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No rule matches found.</p>
              )}
            </div>
          ) : null}

          {(mode === 'hybrid' || mode === 'rag') && result.retrieved && result.retrieved.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-3">Retrieved Medical Knowledge</h2>
              {result.retrieved.map((item, idx) => (
                <div key={idx} className="mb-3 p-3 bg-white rounded border">
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Score:</span> {(item.score * 100).toFixed(1)}%
                  </p>
                  <p className="text-gray-700">{item.text}</p>
                </div>
              ))}
            </div>
          )}

          {mode === 'hybrid' && result.llm_summary && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-3">AI Analysis Summary</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{result.llm_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
