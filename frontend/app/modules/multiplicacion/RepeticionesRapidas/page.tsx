"use client"

import GameHeader from "@/components/molecules/GameHeader"
import InformacionNivel from "@/components/molecules/InformacionNivel"
import JuegoCompletado from "@/components/organisms/JuegoCompletado"
import NivelCompletado from "@/components/organisms/NivelCompletado"
import { useRepeticionesRapidas } from "@/hooks/multiplicacion/useRepeticionesRapidas"
import GamesTemplate from "@/components/templates/conjuntos/GamesTemplate"
import TiempoJuego from "@/components/molecules/TiempoJuego"
import { TimerProvider } from "@/context/timer-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Package, Target, Lightbulb, Sparkles, Grid3X3, CheckCircle, Move, Hand, Star, Smartphone, Zap, Trophy, Trash2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"

const Page = () => {
  return (
    <TimerProvider>
      <GameWrapper />
    </TimerProvider>
  )
}

const GameWrapper = () => {
  const {
    currentLevel,
    currentProblem,
    dragItems,
    dropZones,
    aciertos,
    errores,
    problemsCompleted,
    estrellas,
    progress,
    completedSets,
    totalAciertos,
    currentGameLevel,
    isLastLevel,
    isLevelComplete,
    isGameComplete,
    isGameActive,
    showHint,
    selectedElement,
    draggedItem,
    gameContainerRef,
    elementTypes,
    handleDragStart,
    handleDrop,
    handleRemoveFromZone,
    handleNextLevel,
    handleRestart,
    toggleHint,
  } = useRepeticionesRapidas()

  // Estados para drag and drop táctil mejorado
  const [isDragging, setIsDragging] = useState(false)
  const [draggedElement, setDraggedElement] = useState<any>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 })
  const [draggedOver, setDraggedOver] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<number | null>(null)
  const [touchMode, setTouchMode] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false)
  
  // Estados de animación
  const [isVisible, setIsVisible] = useState(false)
  const [animatedElements, setAnimatedElements] = useState<Set<string>>(new Set())
  const [floatingElements, setFloatingElements] = useState<Array<{ id: number; x: number; y: number; emoji: string }>>([])
  const [celebrationParticles, setCelebrationParticles] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [pulsingZones, setPulsingZones] = useState<Set<number>>(new Set())

  const dragElementRef = useRef<HTMLDivElement>(null)
  const dragContainerRef = useRef<HTMLDivElement>(null)

  // Detectar dispositivo táctil
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setTouchMode(isTouchDevice)
  }, [])

  // Animaciones de entrada optimizadas
  useEffect(() => {
    setIsVisible(true)

    // Generar elementos flotantes
    const elementCount = window.innerWidth < 768 ? 6 : 12
    const floating = Array.from({ length: elementCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      emoji: elementTypes[i % elementTypes.length].emoji,
    }))
    setFloatingElements(floating)

    const elements = ["problem", "elements", "zones", "progress", "hint"]
    elements.forEach((element, index) => {
      setTimeout(() => {
        setAnimatedElements(prev => new Set([...prev, element]))
      }, index * 150)
    })
  }, [elementTypes])

  // Efecto de pulsación en zonas incompletas
  useEffect(() => {
    const incompleteZones = dropZones.filter(zone => !zone.isComplete).map(zone => zone.id)
    setPulsingZones(new Set(incompleteZones))
  }, [dropZones])

  // Partículas de celebración
  const createCelebrationParticles = () => {
    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }))
    setCelebrationParticles(particles)
    setTimeout(() => setCelebrationParticles([]), 2000)
  }

  // Funciones mejoradas para drag and drop táctil
  const handleTouchStart = (e: React.TouchEvent, item: any) => {
    if (item.isPlaced) return

    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()

    // Guardar posición inicial para detectar movimiento
    setTouchStartPos({ x: touch.clientX, y: touch.clientY })
    setHasMoved(false)

    setTouchOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    })

    // Timer para long press (500ms)
    const timer = setTimeout(() => {
      // Solo iniciar drag si no se ha movido mucho
      if (!hasMoved) {
        setDraggedElement(item)
        setIsDragging(true)
        setDragPosition({
          x: touch.clientX - touchOffset.x,
          y: touch.clientY - touchOffset.y,
        })

        // Haptic feedback
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50)
        }

        handleDragStart(item.id)
      }
    }, 500)

    setLongPressTimer(timer)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const moveDistance = Math.sqrt(
      Math.pow(touch.clientX - touchStartPos.x, 2) + 
      Math.pow(touch.clientY - touchStartPos.y, 2)
    )

    // Si se mueve más de 10px, cancelar long press y permitir scroll
    if (moveDistance > 10) {
      setHasMoved(true)
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
      }
    }

    // Solo procesar drag si ya está en modo drag
    if (!isDragging || !draggedElement) return

    // Prevenir scroll solo cuando está arrastrando
    e.preventDefault()

    setDragPosition({
      x: touch.clientX - touchOffset.x,
      y: touch.clientY - touchOffset.y,
    })

    // Detectar sobre qué zona está el dedo
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
    const zoneElement = elementBelow?.closest("[data-zone-id]")

    if (zoneElement) {
      const zoneId = zoneElement.getAttribute("data-zone-id")
      setDraggedOver(`zone-${zoneId}`)
    } else {
      setDraggedOver(null)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Limpiar timer si existe
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    // Si no estaba arrastrando, tratar como tap normal
    if (!isDragging || !draggedElement) {
      if (!hasMoved) {
        // Tap normal - seleccionar elemento
        handleElementClick(draggedElement || e.currentTarget.dataset.item)
      }
      return
    }

    const touch = e.changedTouches[0]

    // Encontrar el elemento debajo del punto de toque
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
    const zoneElement = elementBelow?.closest("[data-zone-id]")

    if (zoneElement) {
      const zoneId = Number.parseInt(zoneElement.getAttribute("data-zone-id") || "0")
      handleDrop(zoneId, draggedElement.id)

      // Haptic feedback para drop exitoso
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
    }

    // Reset drag state
    setIsDragging(false)
    setDraggedElement(null)
    setDraggedOver(null)
    setSelectedItem(null)
    setHasMoved(false)
  }

  // Handle click interaction para desktop y fallback
  const handleElementClick = (item: any) => {
    if (item?.isPlaced) return

    // Haptic feedback para móviles
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50)
    }

    if (selectedItem === item?.id) {
      setSelectedItem(null) // Deselect if clicking same item
    } else {
      setSelectedItem(item?.id)
      handleDragStart(item?.id)
    }
  }

  const handleZoneClick = (zoneId: number) => {
    if (selectedItem !== null) {
      // Haptic feedback
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }

      handleDrop(zoneId, selectedItem)
      setSelectedItem(null)
    }
  }

  // Limpiar todos los elementos de las zonas
  const clearAllZones = () => {
    dropZones.forEach(zone => {
      zone.placedItems.forEach(item => {
        handleRemoveFromZone(item.id)
      })
    })
    setSelectedItem(null)
  }

  const currentElementType = elementTypes[selectedElement]

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Elemento arrastrable para touch */}
      {isDragging && draggedElement && (
        <div
          ref={dragElementRef}
          className="fixed pointer-events-none z-50 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl shadow-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold border-2 border-yellow-300 scale-110"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
            transform: "translate(-50%, -50%)",
            background: `linear-gradient(135deg, ${currentElementType.color.replace('from-', '').replace('to-', '').split(' ')[0]}, ${currentElementType.color.replace('from-', '').replace('to-', '').split(' ')[1]})`,
          }}
        >
          {currentElementType.emoji}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-300 rounded-full flex items-center justify-center">
            <Star className="w-2 h-2 text-yellow-700" />
          </div>
        </div>
      )}

      {/* Partículas de celebración */}
      {celebrationParticles.map((particle) => (
        <div
          key={particle.id}
          className="fixed pointer-events-none z-50 animate-bounce"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: `celebration-float 2s ease-out forwards`,
            animationDelay: `${particle.id * 0.1}s`,
          }}
        >
          <div className="text-2xl">{["🎉", "⭐", "✨", "🌟", "💫", "🎊"][particle.id % 6]}</div>
        </div>
      ))}

      {/* Fondo de construcción optimizado para móviles */}
      <div className="fixed inset-0 bg-gradient-to-br from-green-300 via-blue-400 to-purple-500">
        {/* Elementos flotantes de fondo */}
        <div className="absolute inset-0">
          {floatingElements.map((element) => (
            <div
              key={element.id}
              className="absolute text-lg sm:text-2xl opacity-20 sm:opacity-30"
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                animation: `float-element ${4 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            >
              {element.emoji}
            </div>
          ))}
        </div>
        
        {/* Partículas de construcción */}
        <div className="absolute inset-0">
          {Array.from({ length: window.innerWidth < 768 ? 5 : 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-300 text-lg sm:text-xl opacity-40 sm:opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `construction-sparkle ${3 + Math.random()}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float-element {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(60deg); }
          66% { transform: translateY(-5px) rotate(120deg); }
        }
        
        @keyframes construction-sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.4; }
          50% { transform: scale(1.3) rotate(180deg); opacity: 0.8; }
        }
        
        @keyframes slide-build {
          0% { transform: translateY(15px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes glow-build {
          0%, 100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.6); }
        }
        
        @keyframes pulse-selected {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
        }

        @keyframes pulse-zone {
          0%, 100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.8), 0 0 30px rgba(34, 197, 94, 0.4); }
        }

        @keyframes celebration-float {
          0% { transform: translateY(0) scale(0) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-100px) scale(1.2) rotate(180deg); opacity: 1; }
          100% { transform: translateY(-200px) scale(0) rotate(360deg); opacity: 0; }
        }

        @keyframes bounce-in {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.05) rotate(5deg); }
          70% { transform: scale(0.9) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        
        .animate-slide-build { animation: slide-build 0.5s ease-out forwards; }
        .animate-glow-build { animation: glow-build 2s ease-in-out infinite; }
        .animate-pulse-selected { animation: pulse-selected 1s ease-in-out infinite; }
        .animate-pulse-zone { animation: pulse-zone 2s ease-in-out infinite; }
        .animate-bounce-in { animation: bounce-in 0.6s ease-out forwards; }
        .animate-wiggle { animation: wiggle 0.5s ease-in-out; }
      `}</style>

      <GamesTemplate>
        <div className="max-w-4xl mx-auto px-2 sm:px-4 pt-2 sm:pt-4 relative z-10">
          <GameHeader
            aciertos={aciertos}
            errores={errores}
            completedSets={completedSets.length}
            imagen="/images/icons/multiplicacion.png"
            name="Repeticiones Rápidas"
            totalSets={currentGameLevel?.problemsPerLevel || 1}
            level={currentLevel + 1}
            totalAciertos={totalAciertos + aciertos}
          />

          <TiempoJuego position="top-right" formato="minutos" />

          <InformacionNivel currentLevel={currentLevel} gameLevel={currentGameLevel as any} />

          {isGameComplete ? (
            <JuegoCompletado 
              aciertos={aciertos} 
              estrellas={estrellas} 
              errores={errores} 
              onRestart={handleRestart} 
            />
          ) : isLevelComplete ? (
            <NivelCompletado
              aciertos={aciertos}
              estrellas={estrellas}
              errores={errores}
              nivel={currentLevel + 1}
              isLastLevel={isLastLevel}
              onNextLevel={handleNextLevel}
              onRestart={handleRestart}
            />
          ) : (
            <div className="mt-3 sm:mt-6 space-y-3 sm:space-y-6" ref={gameContainerRef}>
              {/* Problema actual */}
              <Card
                className={`bg-white/95 backdrop-blur-lg border-2 sm:border-4 border-green-400 shadow-xl animate-glow-build ${
                  animatedElements.has("problem") ? "animate-slide-build" : "opacity-0"
                }`}
              >
                <CardContent className="p-3 sm:p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
                      <Package className="w-5 h-5 sm:w-8 sm:h-8 text-green-600" />
                      <h3 className="text-lg sm:text-2xl font-bold text-green-800">
                        ¡Construye Grupos!
                      </h3>
                      <Package className="w-5 h-5 sm:w-8 sm:h-8 text-green-600" />
                    </div>
                    
                    {currentProblem && (
                      <div className="bg-gradient-to-r from-blue-100 to-green-100 rounded-xl sm:rounded-2xl p-3 sm:p-6 border-2 sm:border-4 border-blue-300">
                        <div className="text-xl sm:text-3xl md:text-4xl font-bold text-blue-800 mb-2">
                          {currentProblem.expression} = {currentProblem.result}
                        </div>
                        <p className="text-sm sm:text-lg text-blue-600 mb-3 sm:mb-4">
                          {touchMode ? 'Mantén presionado y arrastra' : 'Arrastra'} {currentProblem.totalElements} {currentElementType.name} para formar {currentProblem.multiplier} grupos de {currentProblem.multiplicand}
                        </p>
                        
                        {/* Instrucciones táctiles mejoradas */}
                        <Card className="mb-3 sm:mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
                          <CardContent className="p-2 sm:p-3">
                            <div className="flex items-center justify-center gap-2 text-blue-700 text-xs sm:text-sm">
                              {touchMode ? (
                                <>
                                  <Hand className="w-4 h-4" />
                                  <span>Mantén presionado 0.5s para arrastrar, o toca para seleccionar</span>
                                </>
                              ) : (
                                <>
                                  <Move className="w-4 h-4" />
                                  <span>Arrastra los elementos a los grupos o haz clic para seleccionar</span>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Sistema de pistas */}
                        <Button
                          onClick={toggleHint}
                          variant="outline"
                          size="sm"
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300 text-xs sm:text-sm"
                        >
                          <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          {showHint ? 'Ocultar' : 'Mostrar'} Pista
                        </Button>
                        
                        {showHint && (
                          <div className="mt-3 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl border border-yellow-200">
                            <p className="text-xs sm:text-sm text-yellow-800">
                              💡 <strong>Pista:</strong> Necesitas hacer {currentProblem.multiplier} grupos, cada uno con exactamente {currentProblem.multiplicand} elementos.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Progreso */}
              <Card
                className={`bg-white/95 backdrop-blur-lg border-2 sm:border-4 border-purple-400 shadow-xl ${
                  animatedElements.has("progress") ? "animate-slide-build" : "opacity-0"
                }`}
                style={{ animationDelay: "0.1s" }}
              >
              </Card>

              {/* Área de construcción - Layout vertical en móvil */}
              <div className="space-y-3 sm:space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                {/* Elementos para arrastrar */}
                <Card
                  className={`bg-white/95 backdrop-blur-lg border-2 sm:border-4 border-yellow-400 shadow-xl ${
                    animatedElements.has("elements") ? "animate-slide-build" : "opacity-0"
                  }`}
                  style={{ animationDelay: "0.2s" }}
                >
                  <CardContent className="p-3 sm:p-6">
                    <div className="text-center mb-3 sm:mb-4">
                      <h4 className="text-base sm:text-lg font-bold text-yellow-800 flex items-center justify-center gap-2">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                        Elementos para Agrupar
                      </h4>
                      <p className="text-xs sm:text-sm text-yellow-600 mt-1 sm:mt-2">
                        {touchMode ? 'Mantén presionado y arrastra' : 'Arrastra'} los {currentElementType.name} a los grupos
                      </p>
                    </div>
                    
                    <div 
                      ref={dragContainerRef}
                      className="relative min-h-[150px] sm:min-h-[200px] bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl border-2 border-yellow-300 p-3 sm:p-4"
                    >
                      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                        {dragItems.filter(item => !item.isPlaced).map((item) => (
                          <button
                            key={item.id}
                            data-item={JSON.stringify(item)}
                            onClick={() => handleElementClick(item)}
                            onTouchStart={(e) => handleTouchStart(e, item)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            draggable={!touchMode}
                            onDragStart={() => !touchMode && handleDragStart(item.id)}
                            className={`
                              w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl border-2 sm:border-3 
                              bg-gradient-to-br ${currentElementType.color} border-opacity-80 
                              flex items-center justify-center text-lg sm:text-2xl transition-all duration-300
                              hover:scale-110 active:scale-95 shadow-lg touch-manipulation select-none relative overflow-hidden
                              ${selectedItem === item.id ? 'animate-pulse-selected' : ''}
                              ${isDragging && draggedElement?.id === item.id ? 'opacity-50 scale-95' : ''}
                            `}
                            style={{ touchAction: 'manipulation' }}
                          >
                            {currentElementType.emoji}
                            
                            {/* Indicador de selección */}
                            {selectedItem === item.id && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-300 rounded-full flex items-center justify-center">
                                <Star className="w-2 h-2 text-yellow-700" />
                              </div>
                            )}

                            {/* Efecto de brillo en hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-30 transform -skew-x-12 hover:translate-x-full transition-all duration-700"></div>
                          </button>
                        ))}
                      </div>
                      
                      {/* Indicador de selección global */}
                      {touchMode && selectedItem !== null && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                          Elemento seleccionado
                        </div>
                      )}

                      {/* Indicador de modo drag */}
                      {isDragging && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                          Arrastrando...
                        </div>
                      )}

                      {/* Botón limpiar elementos */}
                      <div className="absolute bottom-2 right-2">
                        <Button
                          onClick={clearAllZones}
                          size="sm"
                          variant="outline"
                          className="bg-red-100 hover:bg-red-200 text-red-700 border-red-300 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Limpiar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Zonas de drop mejoradas */}
                <Card
                  className={`bg-white/95 backdrop-blur-lg border-2 sm:border-4 border-blue-400 shadow-xl ${
                    animatedElements.has("zones") ? "animate-slide-build" : "opacity-0"
                  }`}
                  style={{ animationDelay: "0.3s" }}
                >
                  <CardContent className="p-3 sm:p-6">
                    <div className="text-center mb-3 sm:mb-4">
                      <h4 className="text-base sm:text-lg font-bold text-blue-800 flex items-center justify-center gap-2">
                        <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
                        Grupos de {currentProblem?.multiplicand}
                      </h4>
                      <p className="text-xs sm:text-sm text-blue-600 mt-1 sm:mt-2">
                        Forma {currentProblem?.multiplier} grupos iguales
                      </p>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      {dropZones.map((zone) => (
                        <button
                          key={zone.id}
                          data-zone-id={zone.id}
                          onClick={() => handleZoneClick(zone.id)}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (draggedItem !== null) {
                              handleDrop(zone.id, draggedItem)
                            }
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDraggedOver(`zone-${zone.id}`)
                          }}
                          onDragLeave={() => setDraggedOver(null)}
                          className={`
                            w-full min-h-[60px] sm:min-h-[80px] rounded-lg sm:rounded-xl border-2 border-dashed p-2 sm:p-3 
                            transition-all duration-300 touch-manipulation relative overflow-hidden
                            ${zone.isComplete 
                              ? 'bg-gradient-to-r from-green-100 to-green-200 border-green-400 shadow-lg' 
                              : draggedOver === `zone-${zone.id}`
                                ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-blue-400 scale-105 shadow-xl'
                                : pulsingZones.has(zone.id)
                                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 animate-pulse-zone'
                                  : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 hover:border-blue-400 hover:scale-102'
                            }
                          `}
                          style={{ touchAction: 'manipulation' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-bold text-blue-800">
                              Grupo {zone.id + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                {zone.placedItems.length}/{zone.expectedCount}
                              </span>
                              {zone.isComplete && (
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 animate-pulse" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 justify-center">
                            {zone.placedItems.map((item) => (
                              <button
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveFromZone(item.id)
                                }}
                                className={`
                                  w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md sm:rounded-lg border-2 border-opacity-80
                                  bg-gradient-to-br ${currentElementType.color} 
                                  flex items-center justify-center text-sm sm:text-lg transition-all duration-300
                                  hover:scale-110 active:scale-95 touch-manipulation shadow-md hover:shadow-lg
                                  relative overflow-hidden
                                `}
                                style={{ touchAction: 'manipulation' }}
                              >
                                {currentElementType.emoji}
                                
                                {/* Efecto de brillo */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-30 transform -skew-x-12 hover:translate-x-full transition-all duration-500"></div>
                              </button>
                            ))}
                            
                            {/* Espacios vacíos con mejor diseño */}
                            {Array.from({ length: zone.expectedCount - zone.placedItems.length }).map((_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md sm:rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-xs sm:text-sm animate-pulse"
                              >
                                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                            ))}
                          </div>

                          {/* Indicador de zona activa */}
                          {draggedOver === `zone-${zone.id}` && (
                            <div className="absolute inset-0 bg-blue-200 opacity-30 rounded-lg animate-pulse"></div>
                          )}

                          {/* Efecto de completado */}
                          {zone.isComplete && (
                            <div className="absolute top-1 right-1">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Información del juego */}
              <Card
                className={`bg-gradient-to-r from-green-100 to-blue-100 border-2 sm:border-4 border-green-300 shadow-xl ${
                  animatedElements.has("hint") ? "animate-slide-build" : "opacity-0"
                }`}
                style={{ animationDelay: "0.4s" }}
              >
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base font-bold">¡Construye y Aprende!</span>
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p className="text-xs sm:text-sm text-green-600">
                    {touchMode ? 'Mantén presionado 0.5s y arrastra' : 'Arrastra'} los elementos para formar grupos iguales y descubrir la multiplicación
                  </p>
                  
                  {/* Indicadores de estado */}
                  <div className="flex justify-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                      <span>Disponible</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                      <span>Seleccionado</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                      <span>Completado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </GamesTemplate>
    </div>
  )
}

export default Page