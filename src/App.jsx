import React, { useState, useMemo, useEffect, useRef } from 'react'
import './index.css'

// Resolve data path relative to Vite's base URL
const BASE = import.meta.env.BASE_URL

function App() {
    // ==========================================
    // APP-LEVEL STATE
    // ==========================================
    const [view, setView] = useState('hub') // 'hub' or 'study'
    const [manifest, setManifest] = useState(null)
    const [searchIndex, setSearchIndex] = useState(null)
    const [loadedModule, setLoadedModule] = useState(null) // the currently loaded module data
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // ==========================================
    // SETTINGS STATE
    // ==========================================
    const [lang, setLang] = useState('ja')
    const [transType, setTransType] = useState('intent')
    const [showColors, setShowColors] = useState(true)
    const [activeWordId, setActiveWordId] = useState(null)

    // Audio Config
    const [audioSpeed, setAudioSpeed] = useState(0.85)
    const [transitionDelay, setTransitionDelay] = useState(1.0)
    const [autoFlipPage, setAutoFlipPage] = useState(false)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Selected Phrase (Right Pane synchronization)
    const [selectedPhraseId, setSelectedPhraseId] = useState(null)

    // Cross Ref Modal
    const [crossRefWord, setCrossRefWord] = useState(null)

    // ==========================================
    // DATA LOADING
    // ==========================================
    useEffect(() => {
        Promise.all([
            fetch(`${BASE}data/manifest.json`).then(r => {
                if (!r.ok) throw new Error(`Failed to load manifest (${r.status})`)
                return r.json()
            }),
            fetch(`${BASE}data/search_index.json`).then(r => {
                if (!r.ok) throw new Error(`Failed to load search index (${r.status})`)
                return r.json()
            })
        ])
            .then(([man, idx]) => {
                setManifest(man)
                setSearchIndex(idx)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setError(err.message)
                setLoading(false)
            })
    }, [])

    const loadModule = async (moduleId) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${BASE}data/modules/${moduleId}.json`)
            if (!res.ok) throw new Error(`Failed to load module "${moduleId}" (${res.status})`)
            const data = await res.json()
            setLoadedModule(data)
            setCurrentPage(1)
            setSelectedPhraseId(data.phrases?.[0]?.id || null)
            setView('study')
        } catch (err) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // ==========================================
    // DERIVED / COMPUTED VALUES (study mode)
    // ==========================================
    const phrases = loadedModule?.phrases || []
    const totalPages = Math.ceil(phrases.length / itemsPerPage)

    const currentPhrases = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return phrases.slice(startIndex, startIndex + itemsPerPage)
    }, [currentPage, phrases])

    // Auto-select the first phrase of a new page when navigating
    useEffect(() => {
        if (currentPhrases.length > 0 && view === 'study') {
            setSelectedPhraseId(currentPhrases[0].id)
        }
    }, [currentPage, currentPhrases, view])

    const selectedPhrase = useMemo(() => {
        return phrases.find(p => p.id === selectedPhraseId) || null
    }, [selectedPhraseId, phrases])

    // Cross Ref — use search index for cross-module lookup
    const crossRefPhrases = useMemo(() => {
        if (!crossRefWord || !searchIndex) return []
        const locations = searchIndex[crossRefWord] || []
        // For now, only show results from the currently loaded module
        // (fetching other modules on-demand could be a future enhancement)
        if (!loadedModule) return []
        const localPhraseIds = locations
            .filter(loc => loc.module_id === loadedModule.id)
            .map(loc => loc.phrase_id)
        return phrases.filter(p => localPhraseIds.includes(p.id))
    }, [crossRefWord, searchIndex, loadedModule, phrases])

    // ==========================================
    // HELPERS
    // ==========================================
    const toggleColors = () => setShowColors(prev => !prev)

    const getWordTypeGuide = () => [
        { type: 'verb', label: lang === 'ja' ? '動詞 (Verb)' : 'Verb', color: 'var(--color-verb)' },
        { type: 'noun', label: lang === 'ja' ? '名詞 (Noun)' : 'Noun', color: 'var(--color-noun)' },
        { type: 'adjective', label: lang === 'ja' ? '形容詞 (Adjective)' : 'Adjective', color: 'var(--color-adjective)' },
        { type: 'adverb', label: lang === 'ja' ? '副詞 (Adverb)' : 'Adverb', color: 'var(--color-adverb)' },
        { type: 'pronoun', label: lang === 'ja' ? '代名詞 (Pronoun)' : 'Pronoun', color: 'var(--color-pronoun)' },
        { type: 'particle', label: lang === 'ja' ? '助詞 (Particle)' : 'Particle', color: 'var(--color-particle)' },
        { type: 'interjection', label: lang === 'ja' ? '感嘆詞 (Interjection)' : 'Interjection', color: 'var(--color-interjection)' },
        { type: 'counter', label: lang === 'ja' ? '助数詞 (Counter)' : 'Counter', color: 'var(--color-counter)' },
        { type: 'determiner', label: lang === 'ja' ? '限定詞 (Determiner)' : 'Determiner', color: 'var(--color-determiner)' },
        { type: 'conjunction', label: lang === 'ja' ? '接続詞 (Conjunction)' : 'Conjunction', color: 'var(--color-conjunction)' },
        { type: 'copula', label: lang === 'ja' ? '繫辞 (Copula)' : 'Copula', color: 'var(--color-copula)' },
    ]

    const getTypeLabel = (type) => {
        const guide = getWordTypeGuide().find(g => g.type === type)
        return guide ? guide.label : type
    }

    const getDifficultyColor = (diff) => {
        switch (diff?.toLowerCase()) {
            case 'beginner': return '#34d399'
            case 'intermediate': return '#fbbf24'
            case 'advanced': return '#f87171'
            default: return 'var(--text-muted)'
        }
    }

    // ==========================================
    // AUDIO (Web Speech API) LOGIC
    // ==========================================
    const [voices, setVoices] = useState([])
    const [isPlayingThrough, setIsPlayingThrough] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [activePlayingId, setActivePlayingId] = useState(null)

    const playQueueRef = useRef([])
    const isPlayingThroughRef = useRef(false)
    const timeoutRef = useRef(null)

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices()
            setVoices(availableVoices)
        }
        loadVoices()
        window.speechSynthesis.onvoiceschanged = loadVoices
        return () => {
            window.speechSynthesis.cancel()
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    const createUtterance = (text) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ko-KR'
        utterance.rate = audioSpeed
        const koreanVoices = voices.filter(v => v.lang.includes('ko'))
        if (koreanVoices.length > 0) {
            const preferredVoice = koreanVoices.find(v =>
                v.name.includes('Google') || v.name.includes('female') || v.name.includes('Yuna')
            )
            utterance.voice = preferredVoice || koreanVoices[0]
        }
        return utterance
    }

    const playSinglePhrase = (e, phraseId, phraseBlocks) => {
        e?.stopPropagation()
        window.speechSynthesis.cancel()
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        stopPlayThrough()
        const fullText = phraseBlocks.map(b => b.surface).join(' ')
        const utterance = createUtterance(fullText)
        utterance.onstart = () => setActivePlayingId(phraseId)
        utterance.onend = () => setActivePlayingId(null)
        utterance.onerror = () => setActivePlayingId(null)
        window.speechSynthesis.speak(utterance)
    }

    const isAutoFlippingRef = useRef(false)
    useEffect(() => {
        if (view !== 'study') return
        if (!isAutoFlippingRef.current) {
            stopPlayThrough()
        } else {
            isAutoFlippingRef.current = false
            setTimeout(() => {
                if (isPlayingThroughRef.current) {
                    const queueItems = currentPhrases.map(p => ({
                        id: p.id,
                        text: p.blocks.map(b => b.surface).join(' ')
                    }))
                    playQueueRef.current = queueItems
                    playNextInQueue()
                }
            }, 500)
        }
    }, [currentPage, view])

    const startPlayThrough = () => {
        window.speechSynthesis.cancel()
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setIsPlayingThrough(true)
        setIsPaused(false)
        isPlayingThroughRef.current = true
        const queueItems = currentPhrases.map(p => ({
            id: p.id,
            text: p.blocks.map(b => b.surface).join(' ')
        }))
        playQueueRef.current = queueItems
        playNextInQueue()
    }

    const playNextInQueue = () => {
        if (!isPlayingThroughRef.current) return
        if (playQueueRef.current.length === 0) {
            if (autoFlipPage && currentPage < totalPages) {
                isAutoFlippingRef.current = true
                setCurrentPage(prev => prev + 1)
            } else {
                stopPlayThrough()
            }
            return
        }
        const { id, text } = playQueueRef.current.shift()
        setSelectedPhraseId(id)
        const utterance = createUtterance(text)
        utterance.onstart = () => setActivePlayingId(id)
        utterance.onend = () => {
            setActivePlayingId(null)
            if (isPlayingThroughRef.current) {
                timeoutRef.current = setTimeout(() => {
                    playNextInQueue()
                }, transitionDelay * 1000)
            }
        }
        utterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e)
            stopPlayThrough()
        }
        window.speechSynthesis.speak(utterance)
    }

    const pausePlayThrough = () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause()
            setIsPaused(true)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }

    const resumePlayThrough = () => {
        if (isPaused) {
            window.speechSynthesis.resume()
            setIsPaused(false)
        }
    }

    const stopPlayThrough = () => {
        window.speechSynthesis.cancel()
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setIsPlayingThrough(false)
        setIsPaused(false)
        setActivePlayingId(null)
        isPlayingThroughRef.current = false
        playQueueRef.current = []
        isAutoFlippingRef.current = false
    }

    const goBackToHub = () => {
        stopPlayThrough()
        setLoadedModule(null)
        setView('hub')
    }

    // ==========================================
    // RENDER: Loading / Error
    // ==========================================
    if (loading && !manifest) {
        return (
            <div className="app-container">
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        )
    }

    if (error && !manifest) {
        return (
            <div className="app-container">
                <div className="loading-screen">
                    <p className="error-text">⚠️ {error}</p>
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
                        Make sure to run <code>npm run data:build</code> first to compile the data files.
                    </p>
                </div>
            </div>
        )
    }

    // ==========================================
    // RENDER: Hub View (Playlist Selection)
    // ==========================================
    if (view === 'hub') {
        return (
            <div className="app-container">
                <div className="hub-screen">
                    <div className="hub-header">
                        <h1 className="hub-title">Korean Learning App</h1>
                        <p className="hub-subtitle">
                            {lang === 'ja' ? 'プレイリストを選んでください' : 'Choose a playlist to start studying'}
                        </p>
                        <div className="hub-lang-toggle">
                            <button
                                className={`toggle-btn ${lang === 'ja' ? 'active' : ''}`}
                                onClick={() => setLang('ja')}
                            >
                                🇯🇵 日本語
                            </button>
                            <button
                                className={`toggle-btn ${lang === 'en' ? 'active' : ''}`}
                                onClick={() => setLang('en')}
                            >
                                🇺🇸 English
                            </button>
                        </div>
                    </div>

                    <div className="hub-grid">
                        {manifest && manifest.map(mod => (
                            <div
                                key={mod.id}
                                className="hub-card"
                                onClick={() => loadModule(mod.id)}
                            >
                                <div className="hub-card-theme">{mod.theme}</div>
                                <h2 className="hub-card-title">{mod.title}</h2>
                                <div className="hub-card-meta">
                                    <span
                                        className="hub-card-difficulty"
                                        style={{ color: getDifficultyColor(mod.difficulty) }}
                                    >
                                        {mod.difficulty}
                                    </span>
                                    <span className="hub-card-count">
                                        {mod.phraseCount} {lang === 'ja' ? 'フレーズ' : 'phrases'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {(!manifest || manifest.length === 0) && (
                        <div className="hub-empty">
                            <p>No playlists found.</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Run <code>npm run data:build</code> to compile your YAML modules.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ==========================================
    // RENDER: Study View (Phrase Browser)
    // ==========================================
    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <button className="back-to-hub-btn" onClick={goBackToHub}>
                    ← {lang === 'ja' ? 'プレイリスト一覧' : 'All Playlists'}
                </button>

                <h1>{loadedModule?.title || 'Korean Learning App'}</h1>
                <div className="module-meta-badge">
                    <span style={{ color: getDifficultyColor(loadedModule?.difficulty) }}>
                        {loadedModule?.difficulty}
                    </span>
                    <span>·</span>
                    <span>{loadedModule?.theme}</span>
                </div>

                <div className="setting-group">
                    <span className="setting-label">Language</span>
                    <button
                        className={`toggle-btn ${lang === 'ja' ? 'active' : ''}`}
                        onClick={() => setLang('ja')}
                    >
                        Japanese (日本語) <span>🇯🇵</span>
                    </button>
                    <button
                        className={`toggle-btn ${lang === 'en' ? 'active' : ''}`}
                        onClick={() => setLang('en')}
                    >
                        English <span>🇺🇸</span>
                    </button>
                </div>

                <div className="setting-group">
                    <span className="setting-label">Global Visuals</span>
                    <button
                        className={`toggle-btn ${transType === 'intent' ? 'active' : ''}`}
                        onClick={() => setTransType('intent')}
                    >
                        Intent Trans Mode <span>✨</span>
                    </button>
                    <button
                        className={`toggle-btn ${transType === 'literal' ? 'active' : ''}`}
                        onClick={() => setTransType('literal')}
                    >
                        Literal Trans Mode <span>📖</span>
                    </button>
                    <button
                        className={`toggle-btn ${showColors ? 'active' : ''}`}
                        onClick={toggleColors}
                    >
                        Syntax Colors {showColors ? 'ON' : 'OFF'} <span>🎨</span>
                    </button>

                    <div className={`syntax-guide ${showColors ? '' : 'hidden'}`}>
                        {getWordTypeGuide().map(item => (
                            <div key={item.type} className="syntax-guide-item">
                                <div className="syntax-dot" style={{ backgroundColor: item.color }}></div>
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audio Controls Panel */}
                <div className="setting-group audio-settings-panel">
                    <span className="setting-label">Audio Settings</span>

                    <div className="slider-container">
                        <label className="slider-label">Speed: {audioSpeed.toFixed(2)}x</label>
                        <input
                            type="range"
                            className="styled-slider"
                            min="0.5" max="1.5" step="0.05"
                            value={audioSpeed}
                            onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="slider-container">
                        <label className="slider-label">Delay: {transitionDelay.toFixed(1)}s</label>
                        <input
                            type="range"
                            className="styled-slider delay"
                            min="0.0" max="3.0" step="0.5"
                            value={transitionDelay}
                            onChange={(e) => setTransitionDelay(parseFloat(e.target.value))}
                        />
                    </div>

                    <button
                        className={`toggle-btn auto-flip-btn ${autoFlipPage ? 'active' : ''}`}
                        onClick={() => setAutoFlipPage(prev => !prev)}
                        title="Automatically turn to the next page when playback finishes"
                    >
                        Auto-flip Page <span>{autoFlipPage ? 'ON' : 'OFF'}</span>
                    </button>
                </div>

            </aside>

            {/* Main Content */}
            <main className="main-content">
                {loading ? (
                    <div className="loading-screen">
                        <div className="loading-spinner"></div>
                        <p>Loading module...</p>
                    </div>
                ) : (
                    <>
                        <div className="panes-wrapper">
                            {/* Left Pane - Phrases */}
                            <div className="pane pane-left">
                                {currentPhrases.map((phrase, index) => {
                                    const absoluteNum = (currentPage - 1) * itemsPerPage + index + 1
                                    const isSelected = selectedPhraseId === phrase.id
                                    const isPlaying = activePlayingId === phrase.id

                                    return (
                                        <div
                                            key={phrase.id}
                                            className={`phrase-row ${isSelected ? 'selected' : ''} ${isPlaying ? 'playing' : ''}`}
                                            onClick={() => setSelectedPhraseId(phrase.id)}
                                        >
                                            <span className="phrase-number">{absoluteNum}.</span>
                                            <div className="words-container">
                                                {phrase.blocks.map(block => {
                                                    const isHovered = activeWordId === block.id
                                                    const syntaxClass = showColors ? `syntax-${block.type}` : ''
                                                    const spaceClass = block.space_after ? 'has-space' : ''

                                                    return (
                                                        <div key={block.id} className="word-block-wrapper">
                                                            <span
                                                                className={`word-block korean-text ${syntaxClass} ${spaceClass} ${isHovered ? 'highlighted' : ''}`}
                                                                onMouseEnter={() => setActiveWordId(block.id)}
                                                                onMouseLeave={() => setActiveWordId(null)}
                                                            >
                                                                {block.surface}
                                                            </span>

                                                            <div className="word-tooltip">
                                                                <span className="tooltip-dict korean-text">{block.dictionary}</span>
                                                                <span className="tooltip-meaning">{block.meanings?.[lang] || block.meanings?.ja || ''}</span>
                                                                <div className="tooltip-arrow"></div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <button
                                                className={`audio-btn-single ${isPlaying ? 'active-audio' : ''}`}
                                                onClick={(e) => playSinglePhrase(e, phrase.id, phrase.blocks)}
                                                title={isPlaying ? "Playing..." : "Play audio"}
                                            >
                                                {isPlaying ? (
                                                    <div className="audio-bars">
                                                        <div className="bar"></div>
                                                        <div className="bar"></div>
                                                        <div className="bar"></div>
                                                    </div>
                                                ) : (
                                                    '🔊'
                                                )}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Right Pane - Translations & Details */}
                            <div className="pane pane-right">
                                {selectedPhrase ? (
                                    <div className="translation-box" key={`trans-${selectedPhrase.id}`}>
                                        <div className="translation-header">
                                            <span className="phrase-number">
                                                {phrases.findIndex(p => p.id === selectedPhrase.id) + 1}.
                                            </span>
                                            <div className={`translation-text translation-${transType}`}>
                                                {selectedPhrase.translations?.[lang]?.[transType] || selectedPhrase.translations?.ja?.[transType] || ''}
                                            </div>
                                        </div>

                                        <div className="word-details-grid">
                                            {selectedPhrase.blocks.map(block => {
                                                const isHovered = activeWordId === block.id
                                                return (
                                                    <div
                                                        key={`detail-${block.id}`}
                                                        className={`word-detail-card ${isHovered ? 'highlighted' : ''}`}
                                                        onMouseEnter={() => setActiveWordId(block.id)}
                                                        onMouseLeave={() => setActiveWordId(null)}
                                                        onClick={() => setCrossRefWord(block.dictionary)}
                                                    >
                                                        <div className="word-type-badge" style={{ color: showColors ? `var(--color-${block.type})` : 'inherit' }}>
                                                            {getTypeLabel(block.type)}
                                                        </div>

                                                        <div className="word-detail-header">
                                                            <span className="word-surface korean-text">{block.surface}</span>
                                                            <span className="word-dict korean-text">{block.dictionary}</span>
                                                        </div>

                                                        <div className="word-meaning">
                                                            {block.meanings?.[lang] || block.meanings?.ja || ''}
                                                        </div>

                                                        {block.grammar_notes && (
                                                            <div className="word-grammar">
                                                                {block.grammar_notes?.[lang] || block.grammar_notes?.ja || ''}
                                                            </div>
                                                        )}

                                                        <div className="action-hint">
                                                            <span>🔍</span> {lang === 'ja' ? 'クリックして他の例文を検索' : 'Click to cross-reference examples'}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-muted)' }}>Select a phrase to see details.</div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Pagination Bar */}
                        <div className="pagination-bar">
                            {/* PLAY THROUGH CONTROLS */}
                            <div className="audio-controls">
                                {!isPlayingThrough ? (
                                    <button className="audio-control-btn play" onClick={startPlayThrough}>
                                        ▶ Play Page
                                    </button>
                                ) : (
                                    <>
                                        {isPaused ? (
                                            <button className="audio-control-btn resume" onClick={resumePlayThrough}>
                                                ▶ Resume
                                            </button>
                                        ) : (
                                            <button className="audio-control-btn pause" onClick={pausePlayThrough}>
                                                ⏸ Pause
                                            </button>
                                        )}
                                        <button className="audio-control-btn stop" onClick={stopPlayThrough}>
                                            ⏹ Stop
                                        </button>
                                    </>
                                )}
                            </div>

                            <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)', margin: '0 1rem' }}></div>

                            <button
                                className="pagination-btn"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                ← Previous
                            </button>
                            <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                            <button
                                className="pagination-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    </>
                )}
            </main>

            {/* Cross Reference Modal */}
            {crossRefWord && (
                <div className="modal-overlay" onClick={() => setCrossRefWord(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {crossRefWord}
                                <span>Cross-Reference Dictionary</span>
                            </h2>
                            <button className="modal-close" onClick={() => setCrossRefWord(null)}>×</button>
                        </div>

                        <div className="modal-body">
                            {crossRefPhrases.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>
                                    {lang === 'ja' ? 'このプレイリスト内に他の例文が見つかりませんでした。' : 'No other examples found in this playlist.'}
                                </div>
                            ) : (
                                crossRefPhrases.map((phrase) => {
                                    const phraseIndex = phrases.findIndex(p => p.id === phrase.id) + 1
                                    return (
                                        <div
                                            key={`modal-${phrase.id}`}
                                            className="cross-ref-item"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                const targetPage = Math.ceil(phraseIndex / itemsPerPage)
                                                setCurrentPage(targetPage)
                                                setSelectedPhraseId(phrase.id)
                                                setCrossRefWord(null)
                                            }}
                                        >
                                            <div className="cross-ref-phrase korean-text">
                                                <span className="phrase-number" style={{ width: 'auto', marginRight: '0.75rem', opacity: 0.5 }}>{phraseIndex}.</span>
                                                {phrase.blocks.map(b => (
                                                    <span
                                                        key={`m-${b.id}`}
                                                        style={{
                                                            color: b.dictionary === crossRefWord ? 'var(--accent)' : 'inherit',
                                                            fontWeight: b.dictionary === crossRefWord ? 'bold' : 'normal',
                                                            marginRight: b.space_after ? '0.5rem' : '0'
                                                        }}
                                                    >
                                                        {b.surface}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="cross-ref-trans">
                                                {phrase.translations?.[lang]?.[transType] || phrase.translations?.ja?.[transType] || ''}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
