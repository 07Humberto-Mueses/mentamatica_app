"use client";

import { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { gameLevels } from '@/public/data/conjuntos/gameLevelsDetective';
import { useUser } from '@clerk/nextjs';
import { convertirErrores } from '@/services/convertidorEstrellas';
import { useTimer } from '@/context/timer-context';
import { UnifiedGameItem } from '@/types/gameTypes';
import { useEnviarResultados } from '../useEnviarResultados';

export const useGameDetective = () => {
  const { toast } = useToast();
  const [currentLevel, setCurrentLevel] = useState(0);
  const [items, setItems] = useState<UnifiedGameItem[]>(gameLevels[0].items);
  const [score, setScore] = useState(0);
  const [completedSets, setCompletedSets] = useState<string[]>([]);
  const [totalAciertos, setTotalAciertos] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [errores, setErrores] = useState(0);
  const dragItem = useRef<UnifiedGameItem | null>(null);
  const currentGameLevel = gameLevels[currentLevel];
  const isLastLevel = currentLevel === gameLevels.length - 1;
  const isLevelComplete = completedSets.length === currentGameLevel.sets.length;
  const isGameComplete = isLastLevel && isLevelComplete;
  const [tiempoFinal, setTiempoFinal] = useState<number | null>(null);
  const { iniciar, detener, reiniciar, tiempo } = useTimer();
  const { user } = useUser();

  useEffect(() => {
    iniciar();
    return () => detener();
  }, []);

  // Resetear estado cuando cambia el nivel
  useEffect(() => {
    setItems(gameLevels[currentLevel].items);
    setCompletedSets([]);
  }, [currentLevel]);

  // UseEffect para verificar si el nivel está completo
  useEffect(() => {
    if (completedSets.length === currentGameLevel.sets.length && completedSets.length > 0) {
      if (!isLastLevel) {
        setTimeout(() => {
          advanceLevel();
        }, 1500);
      }
    }
  }, [completedSets, currentGameLevel.sets.length, isLastLevel]);

  const handleDragStart = (item: UnifiedGameItem) => {
    dragItem.current = item;
  };

  const handleDrop = (setId: string) => {
    if (!dragItem.current) return;

    const item = dragItem.current;
    const isCorrect = item.category === setId;

    if (isCorrect) {
      // Manejar acierto
      handleCorrectClassification(item, setId);
    } else {
      // Manejar error
      handleIncorrectClassification();
    }

    dragItem.current = null;
  };

  const handleCorrectClassification = (item: UnifiedGameItem, setId: string) => {
    // Actualizar items primero
    setItems(prev => {
      const newItems = prev.filter(i => i.id !== item.id);
      
      // Verificar si el conjunto está completo después de remover el item
      const remainingItemsInSet = newItems.filter(i => i.category === setId);
      
      if (remainingItemsInSet.length === 0 && !completedSets.includes(setId)) {
        // Usar setTimeout para asegurar que el estado se actualice correctamente
        setTimeout(() => {
          setCompletedSets(prev => {
            if (!prev.includes(setId)) {
              const newCompletedSets = [...prev, setId];
              
              toast({
                title: "¡Conjunto completado! 🎉",
                description: "Has relacionado todos los elementos de este conjunto.",
                duration: 3000,
              });
              
              return newCompletedSets;
            }
            return prev;
          });
        }, 0);
      }
      
      return newItems;
    });
    
    setScore(prev => prev + 10);
    setAciertos(prev => prev + 1);
    
    toast({
      title: "¡Excelente relación!",
      description: `${item.name} pertenece a ${currentGameLevel.sets.find(s => s.id === setId)?.name}`,
      duration: 2000,
    });
  };

  const handleIncorrectClassification = () => {
    setErrores(prev => prev + 1);
    toast({
      title: "El elemento no pertenece a este conjunto",
      description: "Intenta con otro conjunto",
      duration: 2000,
      variant: "destructive"
    });
  };

  const advanceLevel = () => {
    if (currentLevel < gameLevels.length - 1) {
      setTotalAciertos(prev => prev + score);
      setCurrentLevel(prev => prev + 1);
      setScore(0);

      toast({
        title: "¡Nuevo nivel desbloqueado! 🚀",
        description: `Nivel ${currentLevel + 2}: ${gameLevels[currentLevel + 1].title}`,
        duration: 3000,
      });
    }
  };

  const handleRestart = () => {
    setCurrentLevel(0);
    setItems(gameLevels[0].items);
    setScore(0);
    setTotalAciertos(0);
    setCompletedSets([]);
    setAciertos(0);
    setErrores(0);
    reiniciar();

    toast({
      title: "¡Juego reiniciado! 🔄",
      description: "Comenzando desde el nivel 1",
      duration: 2000,
    });
  };

  const handleTiempoFinalizado = (tiempo: number) => {
    setTiempoFinal(tiempo);
  };

  const estrellas = convertirErrores(errores);

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
  });

  return {
    currentLevel,
    items,
    score,
    completedSets,
    totalAciertos,
    aciertos,
    errores,
    estrellas,
    currentGameLevel,
    isLastLevel,
    isLevelComplete,
    isGameComplete,
    handleDragStart,
    handleDrop,
    handleNextLevel: advanceLevel,
    handleRestart,
    tiempoFinal,
    handleTiempoFinalizado
  };
};