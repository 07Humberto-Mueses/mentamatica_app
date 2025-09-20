"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@clerk/nextjs"
import { useTimer } from "@/context/timer-context"
import { useEnviarResultados } from "../useEnviarResultados"
import { convertirErrores } from "@/services/convertidorEstrellas"

// Configuración de niveles
const carreraNumerosLevels = [
  {
    name: "Nivel 1",
    title: "Carrera básica",
    description: "Sumas del 1 al 15",
    numbersPerLevel: 5,
    maxNumber: 15,
    minNumber: 1,
    timeLimit: 25000, // 25 segundos por problema
  },
  {
    name: "Nivel 2",
    title: "Carrera intermedia",
    description: "Sumas del 1 al 25",
    numbersPerLevel: 5,
    maxNumber: 25,
    minNumber: 1,
    timeLimit: 20000, // 20 segundos por problema
  },
  {
    name: "Nivel 3",
    title: "Carrera avanzada",
    description: "Sumas del 1 al 50",
    numbersPerLevel: 10,
    maxNumber: 50,
    minNumber: 1,
    timeLimit: 15000, // 15 segundos por problema
  },
]

interface RaceProblem {
  id: string
  num1: number
  num2: number
  correctAnswer: number
  userAnswer: string
}

interface RacePosition {
  player: number
  car: number
  position: number // 0-100 percentage
}

const generateRaceProblem = (maxNumber: number, minNumber: number): RaceProblem => {
  const num1 = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber
  const num2 = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber
  const correctAnswer = num1 + num2

  return {
    id: `race-${Date.now()}-${Math.random()}`,
    num1,
    num2,
    correctAnswer,
    userAnswer: "",
  }
}

export const useCarreraNumeros = () => {
  const { toast } = useToast()
  const { user } = useUser()
  const { iniciar, detener, reiniciar, tiempo } = useTimer()

  // Estados del juego
  const [currentLevel, setCurrentLevel] = useState(0)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [currentProblem, setCurrentProblem] = useState<RaceProblem | null>(null)
  const [userAnswer, setUserAnswer] = useState("")
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [isGameActive, setIsGameActive] = useState(false)
  const [completedSets, setCompletedSets] = useState<string[]>([])
  const [totalAciertos, setTotalAciertos] = useState(0)
  const [tiempoFinal, setTiempoFinal] = useState<number | null>(null)
  const [racePositions, setRacePositions] = useState<RacePosition[]>([])
  const [problemTimeLeft, setProblemTimeLeft] = useState(0)
  const [isAnswering, setIsAnswering] = useState(false)

  // Refs
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const problemTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Valores calculados
  const currentGameLevel = carreraNumerosLevels[currentLevel]
  const isLastLevel = currentLevel === carreraNumerosLevels.length - 1
  const isLevelComplete = completedSets.includes(currentLevel.toString())
  const isGameComplete = isLastLevel && isLevelComplete
  const estrellas = convertirErrores(errores)
  const playerPosition = racePositions.find((p) => p.player === 0)?.position || 0

  // Inicializar temporizador
  useEffect(() => {
    iniciar()
    return () => detener()
  }, [iniciar, detener])

  // Inicializar posiciones de carrera
  const initializeRacePositions = useCallback(() => {
    const positions: RacePosition[] = [
      { player: 0, car: 0, position: 0 }, // Jugador
      { player: 1, car: 1, position: 0 }, // Oponente 1
      { player: 2, car: 2, position: 0 }, // Oponente 2
      { player: 3, car: 3, position: 0 }, // Oponente 3
    ]
    setRacePositions(positions)
  }, [])

  // Generar nuevo problema
  const generateNewProblem = useCallback(() => {
    if (!currentGameLevel) return

    const problem = generateRaceProblem(currentGameLevel.maxNumber, currentGameLevel.minNumber)
    setCurrentProblem(problem)
    setUserAnswer("")
    setIsAnswering(false)
    setProblemTimeLeft(currentGameLevel.timeLimit)
    setIsGameActive(true)

    // Iniciar temporizador del problema
    problemTimerRef.current = setInterval(() => {
      setProblemTimeLeft((prev) => {
        if (prev <= 100) {
          // Tiempo agotado
          handleTimeUp()
          return 0
        }
        return prev - 100
      })
    }, 100)
  }, [currentGameLevel])

  // Manejar tiempo agotado
  const handleTimeUp = useCallback(() => {
    if (problemTimerRef.current) {
      clearInterval(problemTimerRef.current)
      problemTimerRef.current = null
    }

    setErrores((prev) => prev + 1)
    toast({
      title: "¡Tiempo agotado!",
      description: "Los oponentes avanzan",
      variant: "destructive",
    })

    // Avanzar oponentes
    setRacePositions((prev) =>
      prev.map((pos) =>
        pos.player !== 0 ? { ...pos, position: Math.min(100, pos.position + Math.random() * 15 + 10) } : pos,
      ),
    )

    // Continuar con el siguiente problema
    setTimeout(() => {
      if (currentProblemIndex < currentGameLevel.numbersPerLevel - 1) {
        setCurrentProblemIndex((prev) => prev + 1)
      } else {
        // Nivel completado
        setCompletedSets((prev) => [...prev, currentLevel.toString()])
        toast({
          title: "¡Nivel completado! 🏁",
          description: `Has completado el ${currentGameLevel.name}`,
        })
      }
    }, 1500)
  }, [currentProblemIndex, currentGameLevel, toast, currentLevel])

  // Manejar cambio en respuesta del usuario
  const handleAnswerChange = useCallback(
    (value: string) => {
      if (!isGameActive || isAnswering) return

      // Solo permitir números
      const numericValue = value.replace(/[^0-9]/g, "")
      setUserAnswer(numericValue)
    },
    [isGameActive, isAnswering],
  )

  // Manejar envío de respuesta
  const handleSubmitAnswer = useCallback(() => {
    if (!currentProblem || !userAnswer || isAnswering) return

    setIsAnswering(true)

    // Limpiar temporizador
    if (problemTimerRef.current) {
      clearInterval(problemTimerRef.current)
      problemTimerRef.current = null
    }

    const isCorrect = Number.parseInt(userAnswer) === currentProblem.correctAnswer

    if (isCorrect) {
      setAciertos((prev) => prev + 1)
      toast({
        title: "¡Excelente!",
        description: `¡${currentProblem.num1} + ${currentProblem.num2} = ${currentProblem.correctAnswer}!`,
      })

      // Avanzar jugador más que los oponentes
      const playerAdvance = 15 + Math.random() * 10
      const opponentAdvance = Math.random() * 8 + 2

      setRacePositions((prev) =>
        prev.map((pos) => ({
          ...pos,
          position:
            pos.player === 0
              ? Math.min(100, pos.position + playerAdvance)
              : Math.min(100, pos.position + opponentAdvance),
        })),
      )
    } else {
      setErrores((prev) => prev + 1)
      toast({
        title: "¡Respuesta incorrecta!",
        description: `La respuesta era ${currentProblem.correctAnswer}`,
        variant: "destructive",
      })

      // Solo avanzar oponentes
      setRacePositions((prev) =>
        prev.map((pos) =>
          pos.player !== 0 ? { ...pos, position: Math.min(100, pos.position + Math.random() * 12 + 8) } : pos,
        ),
      )
    }

    // Continuar con el siguiente problema
    setTimeout(() => {
      if (currentProblemIndex < currentGameLevel.numbersPerLevel - 1) {
        setCurrentProblemIndex((prev) => prev + 1)
      } else {
        // Nivel completado
        setCompletedSets((prev) => [...prev, currentLevel.toString()])
        toast({
          title: "¡Nivel completado! 🏁",
          description: `Has completado el ${currentGameLevel.name}`,
        })
        //
      }
    }, 1500)
  }, [currentProblem, userAnswer, isAnswering, currentProblemIndex, currentGameLevel, toast, currentLevel])

  // Siguiente nivel
  const handleNextLevel = useCallback(() => {
    if (!isLastLevel) {
      setTotalAciertos((prev) => prev + aciertos)
      setCurrentLevel((prev) => prev + 1)
      setCurrentProblemIndex(0)
      initializeRacePositions()
      toast({
        title: "¡Nuevo nivel desbloqueado! 🚀",
        description: `${carreraNumerosLevels[currentLevel + 1].name}`,
      })
    }
  }, [isLastLevel, aciertos, toast, currentLevel, initializeRacePositions])

  // Reiniciar juego
  const handleRestart = useCallback(() => {
    if (problemTimerRef.current) {
      clearInterval(problemTimerRef.current)
      problemTimerRef.current = null
    }

    setCurrentLevel(0)
    setCurrentProblemIndex(0)
    setAciertos(0)
    setErrores(0)
    setCompletedSets([])
    setTotalAciertos(0)
    setTiempoFinal(null)
    setCurrentProblem(null)
    setUserAnswer("")
    setProblemTimeLeft(0)
    setIsAnswering(false)
    initializeRacePositions()

    reiniciar()
    toast({
      title: "¡Juego reiniciado! 🔄",
      description: "Comenzando desde el nivel 1",
    })
  }, [reiniciar, toast, initializeRacePositions])

  // Inicializar posiciones al montar
  useEffect(() => {
    initializeRacePositions()
  }, [initializeRacePositions])

  // Efecto para generar nuevo problema cuando cambia el índice
  useEffect(() => {
    if (currentGameLevel && !isLevelComplete && !isGameComplete) {
      const timeout = setTimeout(() => {
        generateNewProblem()
      }, 100)

      return () => clearTimeout(timeout)
    }
  }, [currentProblemIndex, currentGameLevel, isLevelComplete, isGameComplete, generateNewProblem])

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (problemTimerRef.current) {
        clearInterval(problemTimerRef.current)
      }
    }
  }, [])

  // Efecto para manejar la finalización del juego
  useEffect(() => {
    if (isGameComplete) {
      setTotalAciertos((prev) => prev + aciertos)
      setTiempoFinal(tiempo)
      detener()
    }
  }, [isGameComplete, aciertos, tiempo, detener])

  // Enviar resultados
  useEnviarResultados({
    user: user ? { id: user.id } : {},
    aciertos: totalAciertos + aciertos,
    errores,
    estrellas,
    tiempo,
    isGameComplete,
    tiempoFinal,
    detener,
    setTiempoFinal,
  })

  // Agregar inicialización forzada al montar el componente
  useEffect(() => {
    // Forzar inicialización cuando se monta el componente
    if (currentGameLevel && !currentProblem && !isLevelComplete && !isGameComplete) {
      initializeRacePositions()

      const timeout = setTimeout(() => {
        const problem = generateRaceProblem(currentGameLevel.maxNumber, currentGameLevel.minNumber)
        setCurrentProblem(problem)
        setUserAnswer("")
        setIsAnswering(false)
        setProblemTimeLeft(currentGameLevel.timeLimit)
        setIsGameActive(true)

        // Iniciar temporizador del problema
        problemTimerRef.current = setInterval(() => {
          setProblemTimeLeft((prev) => {
            if (prev <= 100) {
              handleTimeUp()
              return 0
            }
            return prev - 100
          })
        }, 100)
      }, 500)

      return () => clearTimeout(timeout)
    }
  }, [
    currentGameLevel,
    currentProblem,
    isLevelComplete,
    isGameComplete,
    initializeRacePositions,
    handleTimeUp,
  ])

  return {
    // Estados del juego
    currentLevel,
    currentProblemIndex,
    currentProblem,
    userAnswer,
    racePositions,
    problemTimeLeft,
    isAnswering,
    playerPosition,
    aciertos: totalAciertos + aciertos,
    errores,
    estrellas,
    completedSets,
    totalAciertos: totalAciertos + aciertos,
    currentGameLevel,
    isLastLevel,
    isLevelComplete,
    isGameComplete,
    isGameActive,
    gameContainerRef,
    tiempoFinal,

    // Acciones del juego
    handleAnswerChange,
    handleSubmitAnswer,
    handleNextLevel,
    handleRestart,
  }
}