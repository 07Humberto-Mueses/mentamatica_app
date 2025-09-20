import { useState, useEffect, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@clerk/nextjs"
import { useTimer } from "@/context/timer-context"
import { useEnviarResultados } from '../useEnviarResultados';
import { convertirErrores } from "@/services/convertidorEstrellas";

// Configuración de niveles para Memoria Inversa con generación aleatoria
const memoriaInversaLevels = [
  {
    name: "Nivel 1",
    title: "Memoria Básica",
    description: "Encuentra 4 pares",
    difficulty: "Fácil",
    pairs: 4,
    minNumber: 3,
    maxNumber: 10,
  },
  {
    name: "Nivel 2",
    title: "Memoria Intermedia",
    description: "Encuentra 6 pares",
    difficulty: "Medio",
    pairs: 6,
    minNumber: 5,
    maxNumber: 15,
  },
  {
    name: "Nivel 3",
    title: "Memoria Avanzada",
    description: "Encuentra 8 pares",
    difficulty: "Difícil",
    pairs: 8,
    minNumber: 8,
    maxNumber: 20,
  },
]

interface MemoryCard {
  id: number
  type: 'subtraction' | 'addition'
  problem: string
  result: number
  pairId: number
  isFlipped: boolean
  isMatched: boolean
}

export const useMemoriaInversa = () => {
  const { toast } = useToast()
  const { user } = useUser()
  const { iniciar, detener, reiniciar, tiempo } = useTimer()

  // Core game state
  const [currentLevel, setCurrentLevel] = useState(0)
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [completedSets, setCompletedSets] = useState<any[]>([])
  const [totalAciertos, setTotalAciertos] = useState(0)
  const [tiempoFinal, setTiempoFinal] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)

  // Refs
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const animationTimeouts = useRef<NodeJS.Timeout[]>([])
  
  // Computed values
  const currentGameLevel = memoriaInversaLevels[currentLevel]
  const isLastLevel = currentLevel >= memoriaInversaLevels.length - 1
  const isLevelComplete = matchedPairs >= currentGameLevel.pairs
  const isGameComplete = isLastLevel && isLevelComplete
  const estrellas = convertirErrores(errores)
  const isGameActive = !isLevelComplete && !isGameComplete;

  // Initialize timer
  useEffect(() => {
    iniciar()
  }, [iniciar])

  // Generate random cards for current level
  const generateRandomCards = useCallback((level: number): MemoryCard[] => {
    const gameLevel = memoriaInversaLevels[level]
    const cardPairs: MemoryCard[] = []

    for (let i = 0; i < gameLevel.pairs; i++) {
      // Generar números aleatorios dentro del rango del nivel
      const minuend = Math.floor(Math.random() * (gameLevel.maxNumber - gameLevel.minNumber + 1)) + gameLevel.minNumber
      const subtrahend = Math.floor(Math.random() * (minuend - 1)) + 1
      const result = minuend - subtrahend

      // Carta de resta
      cardPairs.push({
        id: i * 2,
        type: 'subtraction',
        problem: `${minuend} - ${subtrahend}`,
        result,
        pairId: i,
        isFlipped: false,
        isMatched: false,
      })

      // Carta de suma (verificación) - más variada
      const additionFormats = [
        `${result} + ${subtrahend}`,
        `${subtrahend} + ${result}`,
      ]
      const randomFormat = additionFormats[Math.floor(Math.random() * additionFormats.length)]

      cardPairs.push({
        id: i * 2 + 1,
        type: 'addition',
        problem: randomFormat,
        result: minuend,
        pairId: i,
        isFlipped: false,
        isMatched: false,
      })
    }

    // Mezclar cartas de forma más aleatoria
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]]
    }

    return cardPairs
  }, [])

  // Handle card press with improved feedback
  const handleCardPress = useCallback((cardId: number) => {
    if (flippedCards.length >= 2) return
    if (flippedCards.includes(cardId)) return
    if (cards.find(c => c.id === cardId)?.isMatched) return

    const newFlippedCards = [...flippedCards, cardId]
    setFlippedCards(newFlippedCards)

    // Flip card with animation
    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, isFlipped: true } : card
    ))

    // Check match when 2 cards are flipped
    if (newFlippedCards.length === 2) {
      setAttempts(prev => prev + 1)
      
      setTimeout(() => {
        const [firstId, secondId] = newFlippedCards
        const firstCard = cards.find(c => c.id === firstId)
        const secondCard = cards.find(c => c.id === secondId)

        if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
          // Match found
          setCards(prev => prev.map(card => 
            (card.id === firstId || card.id === secondId) 
              ? { ...card, isMatched: true }
              : card
          ))
          
          setMatchedPairs(prev => prev + 1)
          setAciertos(prev => prev + 1)
          
          // Mensajes de éxito más variados
          const successMessages = [
            "¡Perfecto! 🧠",
            "¡Excelente memoria! 🌟",
            "¡Increíble! 🎯",
            "¡Fantástico! ⚡"
          ]
          const successDescriptions = [
            "¡Encontraste una pareja!",
            "¡Tu memoria es genial!",
            "¡Sigue así!",
            "¡Vas muy bien!"
          ]
          
          const randomSuccess = Math.floor(Math.random() * successMessages.length)
          toast({
            title: successMessages[randomSuccess],
            description: successDescriptions[randomSuccess],
            duration: 3000,
          })

          // Check if level is complete
          if (matchedPairs + 1 >= currentGameLevel.pairs) {
            setTimeout(() => {
              setCompletedSets([{ id: currentLevel }])
              toast({
                title: "¡Memoria Perfecta! 🌟",
                description: `¡Completaste ${currentGameLevel.name}!`,
                duration: 3000,
              })
            }, 1000)
          }
        } else {
          // No match
          setCards(prev => prev.map(card => 
            (card.id === firstId || card.id === secondId) 
              ? { ...card, isFlipped: false }
              : card
          ))
          setErrores(prev => prev + 1)
          
          // Mensajes de error más motivadores
          const errorMessages = [
            "¡Sigue intentando! 💪",
            "¡Casi lo tienes! 🎯",
            "¡No te rindas! 🚀",
            "¡Puedes hacerlo! ⚡"
          ]
          const randomError = Math.floor(Math.random() * errorMessages.length)
          toast({
            title: errorMessages[randomError],
            description: "¡Inténtalo de nuevo!",
            duration: 3000,
          })          
        }

        setFlippedCards([])
      }, 1000)
    }
  }, [flippedCards, cards, matchedPairs, currentGameLevel, currentLevel, toast])

  // Handle next level with new random cards
  const handleNextLevel = useCallback(() => {
    if (currentLevel < memoriaInversaLevels.length - 1) {
      const newLevel = currentLevel + 1
      setTotalAciertos((prev) => prev + aciertos)
      setCurrentLevel(prev => prev + 1)
      setMatchedPairs(0)
      setAttempts(0)
      setCompletedSets([])
      setFlippedCards([])
      setCards(generateRandomCards(newLevel))
      toast({
        title: "¡Nuevo Desafío! 🧠",
        description: `${memoriaInversaLevels[newLevel].name}`,
      })
    }
  }, [currentLevel, aciertos, generateRandomCards, toast, detener])

  // Handle restart with new random cards
  const handleRestart = useCallback(() => {
    setCurrentLevel(0)
    setMatchedPairs(0)
    setAttempts(0)
    setAciertos(0)
    setErrores(0)
    setCompletedSets([])
    setTotalAciertos(0)
    setTiempoFinal(null)
    setFlippedCards([])
    setCards(generateRandomCards(0))

    reiniciar()
    toast({
      title: "¡Nueva Partida! 🔄",
      description: "¡Entrena tu memoria!",
      duration: 3000,
    })
  }, [generateRandomCards, reiniciar, toast])

  // Toggle hint with better tips
  const toggleHint = useCallback(() => {
    setShowHint(prev => !prev)
    if (!showHint) {
      const hints = [
        "Si tienes '8 - 3', busca '5 + 3' porque ambos dan el mismo resultado.",
        "Las cartas rojas son restas, las verdes son sumas. ¡Busca las que den el mismo número!",
        "Recuerda: si 10 - 4 = 6, entonces 6 + 4 = 10. ¡Son parejas!",
        "Concéntrate en los números, no en los colores. ¡El resultado es lo importante!"
      ]
      const randomHint = hints[Math.floor(Math.random() * hints.length)]
      toast({
        title: "💡 Pista",
        description: randomHint,
        duration: 3000,
      })
    }
  }, [showHint, toast])

  // Initialize cards for current level
  useEffect(() => {
    if (currentGameLevel && cards.length === 0) {
      setCards(generateRandomCards(currentLevel))
    }
  }, [currentGameLevel, cards.length, generateRandomCards, currentLevel])

  useEnviarResultados({
    user: user ? { id: user.id } : {},
    aciertos,
    errores,
    estrellas,
    tiempo,
    isGameComplete,
    tiempoFinal,
    detener,
    setTiempoFinal
  })

  // Cleanup
  useEffect(() => {
    return () => {
      animationTimeouts.current.forEach((timeout) => clearTimeout(timeout))
    }
  }, [])

  return {
    // Core game state
    currentLevel,
    cards,
    flippedCards,
    matchedPairs,
    aciertos,
    errores,
    attempts,
    estrellas,
    completedSets,
    totalAciertos,
    currentGameLevel,
    isLastLevel,
    isLevelComplete,
    isGameComplete,
    isGameActive,
    showHint,
    gameContainerRef,
    tiempoFinal,

    // Game actions
    handleCardPress,
    handleNextLevel,
    handleRestart,
    toggleHint,
  }
}