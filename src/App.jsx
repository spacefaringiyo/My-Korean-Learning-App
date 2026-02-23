import React, { useState, useMemo, useEffect, useRef } from 'react'
import data from './data/database.json'
import './index.css'

function App() {
    const [lang, setLang] = useState('ja') // 'ja' or 'en'
    const [transType, setTransType] = useState('intent') // 'intent' or 'literal'
    const [showColors, setShowColors] = useState(true)
    const [activeWordId, setActiveWordId] = useState(null)

    // Audio Config State
    const [audioSpeed, setAudioSpeed] = useState(0.85)
    const [transitionDelay, setTransitionDelay] = useState(1.0)
    const [autoFlipPage, setAutoFlipPage] = useState(false)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const totalPages = Math.ceil(data.phrases.length / itemsPerPage)

    const currentPhrases = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return data.phrases.slice(startIndex, startIndex + itemsPerPage)
    }, [currentPage])

    // Selected Phrase State (Right Pane synchronization)
    const [selectedPhraseId, setSelectedPhraseId] = useState(data.phrases[0]?.id || null)

    // Auto-select the first phrase of a new page when navigating
    useEffect(() => {
        if (currentPhrases.length > 0) {
            setSelectedPhraseId(currentPhrases[0].id)
        }
    }, [currentPage, currentPhrases])

    // Cross Ref Modal state: holds the dictionary form string
    const [crossRefWord, setCrossRefWord] = useState(null)

    // Find all phrases containing the dictionary word
    const crossRefPhrases = useMemo(() => {
        if (!crossRefWord) return []
        return data.phrases.filter(p =>
            p.blocks.some(b => b.dictionary === crossRefWord)
        )
    }, [crossRefWord])

    const toggleColors = () => setShowColors(prev => !prev)

    const selectedPhrase = useMemo(() => {
        return data.phrases.find(p => p.id === selectedPhraseId) || null
    }, [selectedPhraseId])

    // Helper for human-readable word types
    const getWordTypeGuide = () => [
        { type: 'verb', label: lang === 'ja' ? '動詞 (Verb)' : 'Verb', color: 'var(--color-verb)' },
        { type: 'noun', label: lang === 'ja' ? '名詞 (Noun)' : 'Noun', color: 'var(--color-noun)' },
        { type: 'adjective', label: lang === 'ja' ? '形容詞 (Adjective)' : 'Adjective', color: 'var(--color-adjective)' },
        { type: 'adverb', label: lang === 'ja' ? '副詞 (Adverb)' : 'Adverb', color: 'var(--color-adverb)' },
        { type: 'pronoun', label: lang === 'ja' ? '代名詞 (Pronoun)' : 'Pronoun', color: 'var(--color-pronoun)' },
    ]

    // ==========================================
    // AUDIO (Web Speech API) LOGIC
    // ==========================================
    const [voices, setVoices] = useState([])
    const [isPlayingThrough, setIsPlayingThrough] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [activePlayingId, setActivePlayingId] = useState(null)

    // We use refs to track the play-through queue without causing infinite re-renders
    const playQueueRef = useRef([])
    const isPlayingThroughRef = useRef(false)
    const timeoutRef = useRef(null)

    // Load voices securely (some browsers load async)
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices()
            setVoices(availableVoices)
        }
        loadVoices()
        window.speechSynthesis.onvoiceschanged = loadVoices

        // Cleanup on unmount
        return () => {
            window.speechSynthesis.cancel()
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    // Function to configure and return a valid SpeechSynthesisUtterance
    const createUtterance = (text) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ko-KR'
        utterance.rate = audioSpeed // User controlled speed

        // Find a female Korean voice if possible
        const koreanVoices = voices.filter(v => v.lang.includes('ko'))
        if (koreanVoices.length > 0) {
            const preferredVoice = koreanVoices.find(v =>
                v.name.includes('Google') || v.name.includes('female') || v.name.includes('Yuna')
            )
            utterance.voice = preferredVoice || koreanVoices[0]
        }

        return utterance
    }

    // Play a single phrase
    const playSinglePhrase = (e, phraseId, phraseBlocks) => {
        e?.stopPropagation() // Prevent row selection if clicking the play button directly
        window.speechSynthesis.cancel() // Stop any current audio
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        stopPlayThrough() // interrupt play through if user clicks a single audio manually

        const fullText = phraseBlocks.map(b => b.surface).join(' ')
        const utterance = createUtterance(fullText)

        utterance.onstart = () => setActivePlayingId(phraseId)
        utterance.onend = () => setActivePlayingId(null)
        utterance.onerror = () => setActivePlayingId(null)

        window.speechSynthesis.speak(utterance)
    }

    // --- Play Through Feature ---
    // If the user flips a page manually, we cancel everything.
    // Exception: If we just flipped automatically due to play-through logic, don't stop.
    const isAutoFlippingRef = useRef(false)
    useEffect(() => {
        if (!isAutoFlippingRef.current) {
            stopPlayThrough()
        } else {
            // We just auto flipped. Reset flag and continue queueing this new page.
            isAutoFlippingRef.current = false
            // slight delay to ensure render is applied before starting audio
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
    }, [currentPage])

    const startPlayThrough = () => {
        window.speechSynthesis.cancel() // Stop anything current
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        setIsPlayingThrough(true)
        setIsPaused(false)
        isPlayingThroughRef.current = true

        // Build the queue of texts and IDs for the current page
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
            // Finished the page. Check if we should auto-flip.
            if (autoFlipPage && currentPage < totalPages) {
                isAutoFlippingRef.current = true
                setCurrentPage(prev => prev + 1)
                // The useEffect will catch this flip and restart the queue for the new page
            } else {
                stopPlayThrough()
            }
            return
        }

        const { id, text } = playQueueRef.current.shift()

        // Auto-select the phrase being played for visual tracking on right side
        setSelectedPhraseId(id)

        const utterance = createUtterance(text)

        utterance.onstart = () => setActivePlayingId(id)
        utterance.onend = () => {
            setActivePlayingId(null)
            if (isPlayingThroughRef.current) {
                // Pause logic between transition phrases
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

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <h1>Korean Learning App</h1>

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

                    {/* Syntax Color Guide */}
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
                                    onClick={() => {
                                        // If playing through, let's not break flow unless user manually selects another? 
                                        // Or just standard select behavior.
                                        setSelectedPhraseId(phrase.id)
                                    }}
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

                                                    {/* CSS Hover Tooltip */}
                                                    <div className="word-tooltip">
                                                        <span className="tooltip-dict korean-text">{block.dictionary}</span>
                                                        <span className="tooltip-meaning">{block.meanings[lang]}</span>
                                                        <div className="tooltip-arrow"></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Single Audio Button with Animation */}
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

                    {/* Right Pane - Translations & Details (Single Mode) */}
                    <div className="pane pane-right">
                        {selectedPhrase ? (
                            <div className="translation-box" key={`trans-${selectedPhrase.id}`}>
                                <div className="translation-header">
                                    <span className="phrase-number">
                                        {data.phrases.findIndex(p => p.id === selectedPhrase.id) + 1}.
                                    </span>
                                    <div className={`translation-text translation-${transType}`}>
                                        {selectedPhrase.translations[lang][transType]}
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
                                                {/* Interactive Hint */}
                                                <div className="word-type-badge" style={{ color: showColors ? `var(--color-${block.type})` : 'inherit' }}>
                                                    {block.type}
                                                </div>

                                                <div className="word-detail-header">
                                                    <span className="word-surface korean-text">{block.surface}</span>
                                                    <span className="word-dict korean-text">{block.dictionary}</span>
                                                </div>

                                                <div className="word-meaning">
                                                    {block.meanings[lang]}
                                                </div>

                                                {block.grammar_notes && (
                                                    <div className="word-grammar">
                                                        {block.grammar_notes[lang]}
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
                        disabled={currentPage === 1 && !isAutoFlippingRef.current}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        ← Previous
                    </button>
                    <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                    <button
                        className="pagination-btn"
                        disabled={currentPage === totalPages && !isAutoFlippingRef.current}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        Next →
                    </button>
                </div>
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
                            {crossRefPhrases.map((phrase) => {
                                const phraseIndex = data.phrases.findIndex(p => p.id === phrase.id) + 1
                                return (
                                    <div
                                        key={`modal-${phrase.id}`}
                                        className="cross-ref-item"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            const targetPage = Math.ceil(phraseIndex / itemsPerPage)
                                            setCurrentPage(targetPage)
                                            setSelectedPhraseId(phrase.id)
                                            setCrossRefWord(null) // close modal
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
                                            {phrase.translations[lang][transType]}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
