"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Square, RotateCcw, Shuffle, Volume2, VolumeX } from "lucide-react"

interface ArrayElement {
  value: number
  state: "default" | "comparing" | "swapping" | "sorted" | "pivot"
}

interface SortingStep {
  array: ArrayElement[]
  pass: number
  description: string
  comparisons: number
  swaps: number
  soundType?: "compare" | "swap" | "complete" | "pass"
}

type SortingAlgorithm = "bubble" | "selection" | "insertion" | "merge" | "quick"

export default function SortingVisualizer() {
  const [array, setArray] = useState<ArrayElement[]>([])
  const [originalArray, setOriginalArray] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [algorithm, setAlgorithm] = useState<SortingAlgorithm>("bubble")
  const [speed, setSpeed] = useState([100])
  const [inputValue, setInputValue] = useState("64, 34, 25, 12, 22, 11, 90")
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<SortingStep[]>([])
  const [comparisons, setComparisons] = useState(0)
  const [swaps, setSwaps] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState([50])
  const audioContextRef = useRef<AudioContext | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  const playSound = useCallback(
    (type: "compare" | "swap" | "complete" | "pass", value1?: number, value2?: number) => {
      if (!soundEnabled) return

      const audioContext = initAudioContext()
      if (!audioContext) return

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const baseVolume = (volume[0] / 100) * 0.1 // Keep volume low to avoid harsh sounds

      switch (type) {
        case "compare":
          const compareFreq = 200 + (value1 || 50) * 4
          oscillator.frequency.setValueAtTime(compareFreq, audioContext.currentTime)
          oscillator.type = "sine"
          gainNode.gain.setValueAtTime(baseVolume * 0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.1)
          break

        case "swap":
          oscillator.frequency.setValueAtTime(300 + (value1 || 50) * 3, audioContext.currentTime)
          oscillator.frequency.setValueAtTime(250 + (value2 || 50) * 3, audioContext.currentTime + 0.05)
          oscillator.type = "square"
          gainNode.gain.setValueAtTime(baseVolume * 0.5, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.15)
          break

        case "pass":
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2)
          oscillator.type = "triangle"
          gainNode.gain.setValueAtTime(baseVolume * 0.4, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
          break

        case "complete":
          const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator()
            const gain = audioContext.createGain()
            osc.connect(gain)
            gain.connect(audioContext.destination)

            osc.frequency.setValueAtTime(freq, audioContext.currentTime)
            osc.type = "sine"
            gain.gain.setValueAtTime(baseVolume * 0.3, audioContext.currentTime + index * 0.1)
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8)
            osc.start(audioContext.currentTime + index * 0.1)
            osc.stop(audioContext.currentTime + 0.8)
          })
          break
      }
    },
    [soundEnabled, volume, initAudioContext],
  )

  const initializeArray = useCallback(() => {
    try {
      const values = inputValue
        .split(",")
        .map((val) => Number.parseInt(val.trim()))
        .filter((val) => !isNaN(val) && val >= 1 && val <= 100)

      if (values.length === 0) {
        throw new Error("No valid numbers found")
      }

      const newArray = values.map((value) => ({ value, state: "default" as const }))
      setArray(newArray)
      setOriginalArray(values)
      setCurrentStep(0)
      setSteps([])
      setComparisons(0)
      setSwaps(0)
      setIsPlaying(false)
    } catch (error) {
      console.error("Invalid input:", error)
    }
  }, [inputValue])

  const generateRandomArray = () => {
    const size = 8 + Math.floor(Math.random() * 7) // 8-14 elements
    const values = Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10)
    setInputValue(values.join(", "))
  }

  const resetArray = () => {
    const newArray = originalArray.map((value) => ({ value, state: "default" as const }))
    setArray(newArray)
    setCurrentStep(0)
    setComparisons(0)
    setSwaps(0)
    setIsPlaying(false)
  }

  const bubbleSort = (arr: ArrayElement[]): SortingStep[] => {
    const steps: SortingStep[] = []
    const array = [...arr]
    let totalComparisons = 0
    let totalSwaps = 0

    steps.push({
      array: [...array],
      pass: 0,
      description: "Initial array - Starting Bubble Sort",
      comparisons: totalComparisons,
      swaps: totalSwaps,
    })

    for (let pass = 0; pass < array.length - 1; pass++) {
      let swappedInThisPass = false

      steps.push({
        array: [...array],
        pass: pass + 1,
        description: `Pass ${pass + 1}: Comparing adjacent elements`,
        comparisons: totalComparisons,
        swaps: totalSwaps,
        soundType: "pass",
      })

      for (let j = 0; j < array.length - pass - 1; j++) {
        array[j].state = "comparing"
        array[j + 1].state = "comparing"
        totalComparisons++

        steps.push({
          array: [...array],
          pass: pass + 1,
          description: `Pass ${pass + 1}: Comparing ${array[j].value} and ${array[j + 1].value}`,
          comparisons: totalComparisons,
          swaps: totalSwaps,
          soundType: "compare",
        })

        if (array[j].value > array[j + 1].value) {
          array[j].state = "swapping"
          array[j + 1].state = "swapping"

          steps.push({
            array: [...array],
            pass: pass + 1,
            description: `Pass ${pass + 1}: Swapping ${array[j].value} and ${array[j + 1].value}`,
            comparisons: totalComparisons,
            swaps: totalSwaps,
            soundType: "swap",
          })
          ;[array[j], array[j + 1]] = [array[j + 1], array[j]]
          totalSwaps++
          swappedInThisPass = true

          steps.push({
            array: [...array],
            pass: pass + 1,
            description: `Pass ${pass + 1}: Swapped! New positions`,
            comparisons: totalComparisons,
            swaps: totalSwaps,
          })
        }

        array[j].state = "default"
        array[j + 1].state = "default"
      }

      array[array.length - 1 - pass].state = "sorted"
      steps.push({
        array: [...array],
        pass: pass + 1,
        description: `Pass ${pass + 1} complete: ${array[array.length - 1 - pass].value} is in final position`,
        comparisons: totalComparisons,
        swaps: totalSwaps,
      })

      if (!swappedInThisPass) {
        steps.push({
          array: [...array],
          pass: pass + 1,
          description: "No swaps needed - array is sorted!",
          comparisons: totalComparisons,
          swaps: totalSwaps,
        })
        break
      }
    }

    for (let i = 0; i < array.length; i++) {
      if (array[i].state !== "sorted") {
        array[i].state = "sorted"
      }
    }

    steps.push({
      array: [...array],
      pass: steps.length > 0 ? steps[steps.length - 1].pass : 1,
      description: "Bubble Sort Complete! All elements are sorted",
      comparisons: totalComparisons,
      swaps: totalSwaps,
      soundType: "complete",
    })

    return steps
  }

  const selectionSort = (arr: ArrayElement[]): SortingStep[] => {
    const steps: SortingStep[] = []
    const array = [...arr]
    let totalComparisons = 0
    let totalSwaps = 0

    steps.push({
      array: [...array],
      pass: 0,
      description: "Initial array - Starting Selection Sort",
      comparisons: totalComparisons,
      swaps: totalSwaps,
    })

    for (let pass = 0; pass < array.length - 1; pass++) {
      let minIdx = pass
      array[minIdx].state = "pivot"

      steps.push({
        array: [...array],
        pass: pass + 1,
        description: `Pass ${pass + 1}: Finding minimum element from position ${pass}`,
        comparisons: totalComparisons,
        swaps: totalSwaps,
        soundType: "pass",
      })

      for (let j = pass + 1; j < array.length; j++) {
        array[j].state = "comparing"
        totalComparisons++

        steps.push({
          array: [...array],
          pass: pass + 1,
          description: `Pass ${pass + 1}: Comparing ${array[j].value} with current minimum ${array[minIdx].value}`,
          comparisons: totalComparisons,
          swaps: totalSwaps,
          soundType: "compare",
        })

        if (array[j].value < array[minIdx].value) {
          array[minIdx].state = "default"
          minIdx = j
          array[minIdx].state = "pivot"

          steps.push({
            array: [...array],
            pass: pass + 1,
            description: `Pass ${pass + 1}: New minimum found: ${array[minIdx].value}`,
            comparisons: totalComparisons,
            swaps: totalSwaps,
          })
        } else {
          array[j].state = "default"
        }
      }

      if (minIdx !== pass) {
        array[pass].state = "swapping"
        array[minIdx].state = "swapping"

        steps.push({
          array: [...array],
          pass: pass + 1,
          description: `Pass ${pass + 1}: Swapping ${array[pass].value} with minimum ${array[minIdx].value}`,
          comparisons: totalComparisons,
          swaps: totalSwaps,
          soundType: "swap",
        })
        ;[array[pass], array[minIdx]] = [array[minIdx], array[pass]]
        totalSwaps++

        steps.push({
          array: [...array],
          pass: pass + 1,
          description: `Pass ${pass + 1}: Swapped! ${array[pass].value} is now in position ${pass}`,
          comparisons: totalComparisons,
          swaps: totalSwaps,
        })
      }

      array[pass].state = "sorted"
      if (minIdx !== pass) array[minIdx].state = "default"

      steps.push({
        array: [...array],
        pass: pass + 1,
        description: `Pass ${pass + 1} complete: Position ${pass} is sorted with ${array[pass].value}`,
        comparisons: totalComparisons,
        swaps: totalSwaps,
      })
    }

    if (array.length > 0) {
      array[array.length - 1].state = "sorted"
      steps.push({
        array: [...array],
        pass: array.length - 1,
        description: "Selection Sort Complete! All elements are sorted",
        comparisons: totalComparisons,
        swaps: totalSwaps,
        soundType: "complete",
      })
    }

    return steps
  }

  const insertionSort = (arr: ArrayElement[]): SortingStep[] => {
    const steps: SortingStep[] = []
    const array = [...arr]
    let totalComparisons = 0
    let totalSwaps = 0

    steps.push({
      array: [...array],
      pass: 0,
      description: "Initial array - Starting Insertion Sort",
      comparisons: totalComparisons,
      swaps: totalSwaps,
    })

    array[0].state = "sorted"
    steps.push({
      array: [...array],
      pass: 1,
      description: "Pass 1: First element is considered sorted",
      comparisons: totalComparisons,
      swaps: totalSwaps,
    })

    for (let pass = 1; pass < array.length; pass++) {
      const key = { ...array[pass] }
      key.state = "comparing"
      array[pass] = key

      steps.push({
        array: [...array],
        pass: pass + 1,
        description: `Pass ${pass + 1}: Inserting ${key.value} into sorted portion`,
        comparisons: totalComparisons,
        swaps: totalSwaps,
        soundType: "pass",
      })

      let j = pass - 1
      while (j >= 0 && array[j].value > key.value) {
        totalComparisons++
        array[j].state = "swapping"
        array[j + 1].state = "swapping"

        steps.push({
          array: [...array],
          pass: pass + 1,
          description: `Pass ${pass + 1}: Moving ${array[j].value} one position right`,
          comparisons: totalComparisons,
          swaps: totalSwaps,
          soundType: "compare",
        })

        array[j + 1] = { ...array[j] }
        totalSwaps++

        steps.push({
          array: [...array],
          pass: pass + 1,
          description: `Pass ${pass + 1}: ${array[j].value} moved right`,
          comparisons: totalComparisons,
          swaps: totalSwaps,
          soundType: "swap",
        })

        array[j].state = "sorted"
        j--
      }

      array[j + 1] = { ...key, state: "sorted" }

      steps.push({
        array: [...array],
        pass: pass + 1,
        description: `Pass ${pass + 1} complete: ${key.value} inserted at position ${j + 1}`,
        comparisons: totalComparisons,
        swaps: totalSwaps,
      })
    }

    steps.push({
      array: [...array],
      pass: array.length,
      description: "Insertion Sort Complete! All elements are sorted",
      comparisons: totalComparisons,
      swaps: totalSwaps,
      soundType: "complete",
    })

    return steps
  }

  const mergeSort = (arr: ArrayElement[]): SortingStep[] => {
    const steps: SortingStep[] = []
    const array = [...arr]

    const merge = (left: ArrayElement[], right: ArrayElement[]): ArrayElement[] => {
      const result: ArrayElement[] = []
      let leftIndex = 0
      let rightIndex = 0

      while (leftIndex < left.length && rightIndex < right.length) {
        if (left[leftIndex].value < right[rightIndex].value) {
          result.push(left[leftIndex])
          leftIndex++
        } else {
          result.push(right[rightIndex])
          rightIndex++
        }
      }

      return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex))
    }

    const sort = (array: ArrayElement[]): ArrayElement[] => {
      if (array.length <= 1) return array

      const middle = Math.floor(array.length / 2)
      const left = array.slice(0, middle)
      const right = array.slice(middle)

      return merge(sort(left), sort(right))
    }

    const sortedArray = sort(array)
    setArray(sortedArray)
    setCurrentStep(0)
    setSteps([])
    setComparisons(0)
    setSwaps(0)
    setIsPlaying(false)

    return steps
  }

  const quickSort = (arr: ArrayElement[]): SortingStep[] => {
    const steps: SortingStep[] = []
    const array = [...arr]

    const partition = (low: number, high: number): number => {
      const pivot = array[high]
      let i = low - 1

      for (let j = low; j < high; j++) {
        array[j].state = "comparing"
        steps.push([...array])
        if (array[j].value < pivot.value) {
          i++
          array[i].state = "swapping"
          array[j].state = "swapping"
          steps.push([...array])
          ;[array[i], array[j]] = [array[j], array[i]]
          steps.push([...array])
        }
        array[j].state = "default"
      }

      array[i + 1].state = "swapping"
      array[high].state = "swapping"
      steps.push([...array])
      ;[array[i + 1], array[high]] = [array[high], array[i + 1]]
      steps.push([...array])

      array[i + 1].state = "pivot"
      steps.push([...array])

      return i + 1
    }

    const quickSortRecursive = (low: number, high: number) => {
      if (low < high) {
        const pi = partition(low, high)

        array[pi].state = "sorted"
        steps.push([...array])

        quickSortRecursive(low, pi - 1)
        quickSortRecursive(pi + 1, high)
      }
    }

    quickSortRecursive(0, array.length - 1)
    setArray(array)
    setCurrentStep(0)
    setSteps([])
    setComparisons(0)
    setSwaps(0)
    setIsPlaying(false)

    return steps
  }

  const generateSteps = useCallback(() => {
    if (array.length === 0) return

    let newSteps: SortingStep[] = []

    switch (algorithm) {
      case "bubble":
        newSteps = bubbleSort(array)
        break
      case "selection":
        newSteps = selectionSort(array)
        break
      case "insertion":
        newSteps = insertionSort(array)
        break
      case "merge":
        newSteps = mergeSort(array)
        break
      case "quick":
        newSteps = quickSort(array)
        break
      default:
        newSteps = bubbleSort(array)
    }

    setSteps(newSteps)
    setCurrentStep(0)
    if (newSteps.length > 0) {
      setComparisons(newSteps[0].comparisons)
      setSwaps(newSteps[0].swaps)
    }
  }, [array, algorithm])

  const togglePlay = () => {
    if (steps.length === 0) {
      generateSteps()
    }
    setIsPlaying(!isPlaying)
  }

  useEffect(() => {
    if (!isPlaying || steps.length === 0) return

    const timer = setTimeout(
      () => {
        if (currentStep < steps.length - 1) {
          const nextStep = currentStep + 1
          setCurrentStep(nextStep)
          setArray(steps[nextStep].array)
          setComparisons(steps[nextStep].comparisons)
          setSwaps(steps[nextStep].swaps)

          const step = steps[nextStep]
          if (step.soundType) {
            const currentArray = step.array
            const comparingElements = currentArray.filter((el) => el.state === "comparing" || el.state === "swapping")
            if (comparingElements.length >= 2) {
              playSound(step.soundType, comparingElements[0].value, comparingElements[1].value)
            } else if (comparingElements.length === 1) {
              playSound(step.soundType, comparingElements[0].value)
            } else {
              playSound(step.soundType)
            }
          }
        } else {
          setIsPlaying(false)
        }
      },
      1100 - speed[0] * 10,
    )

    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, steps, speed, playSound])

  useEffect(() => {
    initializeArray()
  }, [initializeArray])

  const getBarColor = (state: ArrayElement["state"]) => {
    switch (state) {
      case "comparing":
        return "bg-yellow-500"
      case "swapping":
        return "bg-red-500"
      case "sorted":
        return "bg-green-500"
      case "pivot":
        return "bg-blue-500"
      default:
        return "bg-gray-400"
    }
  }

  const maxValue = Math.max(...array.map((el) => el.value), 1)
  const currentStepInfo = steps[currentStep]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Array Sorting Visualizer</h1>
        <p className="text-muted-foreground">Watch how different sorting algorithms work step by step</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Configure your sorting visualization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Array (comma-separated)</label>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="64, 34, 25, 12, 22, 11, 90"
              />
              <div className="flex gap-2">
                <Button onClick={initializeArray} variant="outline" size="sm">
                  Set Array
                </Button>
                <Button onClick={generateRandomArray} variant="outline" size="sm">
                  <Shuffle className="w-4 h-4 mr-1" />
                  Random
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Algorithm</label>
              <Select value={algorithm} onValueChange={(value: SortingAlgorithm) => setAlgorithm(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bubble">Bubble Sort</SelectItem>
                  <SelectItem value="selection">Selection Sort</SelectItem>
                  <SelectItem value="insertion">Insertion Sort</SelectItem>
                  <SelectItem value="merge">Merge Sort</SelectItem>
                  <SelectItem value="quick">Quick Sort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Speed: {speed[0]}%</label>
              <Slider value={speed} onValueChange={setSpeed} max={100} min={10} step={10} className="w-full" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sound Effects</label>
                <Button variant="ghost" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </div>
              {soundEnabled && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Volume: {volume[0]}%</label>
                  <Slider value={volume} onValueChange={setVolume} max={100} min={0} step={10} className="w-full" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={togglePlay} className="flex-1">
                {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button onClick={resetArray} variant="outline">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button onClick={() => setIsPlaying(false)} variant="outline">
                <Square className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm">
                <span className="font-medium">Step:</span> {currentStep + 1} / {steps.length || 1}
              </div>
              {currentStepInfo && (
                <div className="text-sm">
                  <span className="font-medium">Pass:</span> {currentStepInfo.pass}
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">Comparisons:</span> {comparisons}
              </div>
              <div className="text-sm">
                <span className="font-medium">Swaps:</span> {swaps}
              </div>
              <div className="text-sm">
                <span className="font-medium">Array Size:</span> {array.length}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Legend</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded"></div>
                  <span>Unsorted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Comparing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Swapping</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Sorted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Pivot/Min</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{algorithm.charAt(0).toUpperCase() + algorithm.slice(1)} Sort Visualization</CardTitle>
            <CardDescription>Watch the algorithm sort your array in real-time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStepInfo && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-center">{currentStepInfo.description}</p>
              </div>
            )}

            <div className="h-96 flex items-end justify-center gap-1 p-4 bg-muted/20 rounded-lg">
              {array.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Enter an array to start visualizing
                </div>
              ) : (
                array.map((element, index) => (
                  <div key={index} className={`flex flex-col items-center gap-1 transition-all duration-300`}>
                    <div
                      className={`w-8 rounded-t transition-all duration-300 ${getBarColor(element.state)}`}
                      style={{
                        height: `${(element.value / maxValue) * 300}px`,
                        minHeight: "20px",
                      }}
                    />
                    <span className="text-xs font-mono text-center w-8">{element.value}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Algorithm Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {algorithm === "bubble" && (
              <>
                <div>
                  <h4 className="font-medium">Time Complexity</h4>
                  <p className="text-sm text-muted-foreground">Best: O(n) | Average: O(n²) | Worst: O(n²)</p>
                </div>
                <div>
                  <h4 className="font-medium">Space Complexity</h4>
                  <p className="text-sm text-muted-foreground">O(1)</p>
                </div>
                <div>
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Repeatedly compares adjacent elements and swaps them if they're in wrong order.
                  </p>
                </div>
              </>
            )}
            {algorithm === "selection" && (
              <>
                <div>
                  <h4 className="font-medium">Time Complexity</h4>
                  <p className="text-sm text-muted-foreground">Best: O(n²) | Average: O(n²) | Worst: O(n²)</p>
                </div>
                <div>
                  <h4 className="font-medium">Space Complexity</h4>
                  <p className="text-sm text-muted-foreground">O(1)</p>
                </div>
                <div>
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Finds the minimum element and places it at the beginning, then repeats for remaining elements.
                  </p>
                </div>
              </>
            )}
            {algorithm === "insertion" && (
              <>
                <div>
                  <h4 className="font-medium">Time Complexity</h4>
                  <p className="text-sm text-muted-foreground">Best: O(n) | Average: O(n²) | Worst: O(n²)</p>
                </div>
                <div>
                  <h4 className="font-medium">Space Complexity</h4>
                  <p className="text-sm text-muted-foreground">O(1)</p>
                </div>
                <div>
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Builds the sorted array one element at a time by inserting each element into its correct position.
                  </p>
                </div>
              </>
            )}
            {algorithm === "merge" && (
              <>
                <div>
                  <h4 className="font-medium">Time Complexity</h4>
                  <p className="text-sm text-muted-foreground">
                    Best: O(n log n) | Average: O(n log n) | Worst: O(n log n)
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Space Complexity</h4>
                  <p className="text-sm text-muted-foreground">O(n)</p>
                </div>
                <div>
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Divides the array into halves, sorts each half, and then merges them.
                  </p>
                </div>
              </>
            )}
            {algorithm === "quick" && (
              <>
                <div>
                  <h4 className="font-medium">Time Complexity</h4>
                  <p className="text-sm text-muted-foreground">Best: O(n log n) | Average: O(n log n) | Worst: O(n²)</p>
                </div>
                <div>
                  <h4 className="font-medium">Space Complexity</h4>
                  <p className="text-sm text-muted-foreground">O(log n)</p>
                </div>
                <div>
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Selects a pivot element and partitions the array around it.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
