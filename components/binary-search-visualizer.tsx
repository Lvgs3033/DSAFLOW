"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Square, RotateCcw, Shuffle, Volume2, VolumeX } from "lucide-react"

interface ArrayElement {
  value: number
  index: number
  state: "default" | "left" | "right" | "middle" | "found" | "eliminated"
}

interface SearchStep {
  array: ArrayElement[]
  left: number
  right: number
  middle: number
  target: number
  comparison: "less" | "greater" | "equal" | null
  description: string
  found: boolean
  iterations: number
}

export default function BinarySearchVisualizer() {
  const [array, setArray] = useState<ArrayElement[]>([])
  const [originalArray, setOriginalArray] = useState<number[]>([])
  const [target, setTarget] = useState<number>(50)
  const [inputValue, setInputValue] = useState("10, 23, 35, 42, 56, 67, 78, 89, 95")
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState([50])
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<SearchStep[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState([40])
  const audioContextRef = useRef<AudioContext | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  const playSound = useCallback(
    (type: "compare" | "found" | "notfound" | "eliminate", frequency?: number) => {
      if (!soundEnabled) return

      const audioContext = initAudioContext()
      if (!audioContext) return

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const baseVolume = (volume[0] / 100) * 0.08

      switch (type) {
        case "compare":
          oscillator.frequency.setValueAtTime(frequency || 440, audioContext.currentTime)
          oscillator.type = "sine"
          gainNode.gain.setValueAtTime(baseVolume * 0.4, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
          break

        case "eliminate":
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3)
          oscillator.type = "sawtooth"
          gainNode.gain.setValueAtTime(baseVolume * 0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
          break

        case "found":
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

        case "notfound":
          oscillator.frequency.setValueAtTime(150, audioContext.currentTime)
          oscillator.type = "square"
          gainNode.gain.setValueAtTime(baseVolume * 0.4, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.5)
          break
      }
    },
    [soundEnabled, volume, initAudioContext],
  )

  // Initialize array from input
  const initializeArray = useCallback(() => {
    try {
      const values = inputValue
        .split(",")
        .map((val) => Number.parseInt(val.trim()))
        .filter((val) => !isNaN(val))
        .sort((a, b) => a - b) // Ensure array is sorted

      if (values.length === 0) {
        throw new Error("No valid numbers found")
      }

      const newArray = values.map((value, index) => ({
        value,
        index,
        state: "default" as const,
      }))

      setArray(newArray)
      setOriginalArray(values)
      setCurrentStep(0)
      setSteps([])
      setIsPlaying(false)
    } catch (error) {
      console.error("Invalid input:", error)
    }
  }, [inputValue])

  // Generate random sorted array
  const generateRandomArray = () => {
    const size = 8 + Math.floor(Math.random() * 7) // 8-14 elements
    const values = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1)
      .sort((a, b) => a - b)
      .filter((value, index, arr) => arr.indexOf(value) === index) // Remove duplicates

    setInputValue(values.join(", "))
    setTarget(values[Math.floor(Math.random() * values.length)]) // Set target to existing value
  }

  // Binary search algorithm
  const binarySearch = useCallback((arr: ArrayElement[], targetValue: number): SearchStep[] => {
    const steps: SearchStep[] = []
    let left = 0
    let right = arr.length - 1
    let iterations = 0

    // Initial state
    const initialArray = arr.map((el, idx) => ({
      ...el,
      state: idx === left ? "left" : idx === right ? "right" : "default",
    }))

    steps.push({
      array: [...initialArray],
      left,
      right,
      middle: -1,
      target: targetValue,
      comparison: null,
      description: `Starting binary search for ${targetValue} in sorted array`,
      found: false,
      iterations,
    })

    while (left <= right) {
      iterations++
      const middle = Math.floor((left + right) / 2)

      // Update array states
      const currentArray = arr.map((el, idx) => ({
        ...el,
        state:
          idx === left
            ? "left"
            : idx === right
              ? "right"
              : idx === middle
                ? "middle"
                : idx < left || idx > right
                  ? "eliminated"
                  : "default",
      }))

      steps.push({
        array: [...currentArray],
        left,
        right,
        middle,
        target: targetValue,
        comparison: null,
        description: `Iteration ${iterations}: Checking middle element at index ${middle} (value: ${arr[middle].value})`,
        found: false,
        iterations,
      })

      if (arr[middle].value === targetValue) {
        // Found the target
        const foundArray = currentArray.map((el, idx) => ({
          ...el,
          state: idx === middle ? "found" : el.state,
        }))

        steps.push({
          array: [...foundArray],
          left,
          right,
          middle,
          target: targetValue,
          comparison: "equal",
          description: `Found ${targetValue} at index ${middle}! Search completed in ${iterations} iterations.`,
          found: true,
          iterations,
        })
        break
      } else if (arr[middle].value < targetValue) {
        // Target is in the right half
        steps.push({
          array: [...currentArray],
          left,
          right,
          middle,
          target: targetValue,
          comparison: "less",
          description: `${arr[middle].value} < ${targetValue}. Target must be in the right half.`,
          found: false,
          iterations,
        })

        // Eliminate left half
        const eliminatedArray = currentArray.map((el, idx) => ({
          ...el,
          state: idx <= middle ? "eliminated" : el.state,
        }))

        left = middle + 1

        steps.push({
          array: [...eliminatedArray],
          left,
          right,
          middle,
          target: targetValue,
          comparison: "less",
          description: `Eliminating left half. New search range: [${left}, ${right}]`,
          found: false,
          iterations,
        })
      } else {
        // Target is in the left half
        steps.push({
          array: [...currentArray],
          left,
          right,
          middle,
          target: targetValue,
          comparison: "greater",
          description: `${arr[middle].value} > ${targetValue}. Target must be in the left half.`,
          found: false,
          iterations,
        })

        // Eliminate right half
        const eliminatedArray = currentArray.map((el, idx) => ({
          ...el,
          state: idx >= middle ? "eliminated" : el.state,
        }))

        right = middle - 1

        steps.push({
          array: [...eliminatedArray],
          left,
          right,
          middle,
          target: targetValue,
          comparison: "greater",
          description: `Eliminating right half. New search range: [${left}, ${right}]`,
          found: false,
          iterations,
        })
      }
    }

    // If not found
    if (steps.length === 0 || !steps[steps.length - 1].found) {
      const finalArray = arr.map((el) => ({ ...el, state: "eliminated" as const }))
      steps.push({
        array: [...finalArray],
        left,
        right,
        middle: -1,
        target: targetValue,
        comparison: null,
        description: `${targetValue} not found in array. Search completed in ${iterations} iterations.`,
        found: false,
        iterations,
      })
    }

    return steps
  }, [])

  // Generate search steps
  const generateSteps = useCallback(() => {
    if (array.length === 0) return

    const newSteps = binarySearch(array, target)
    setSteps(newSteps)
    setCurrentStep(0)
  }, [array, target, binarySearch])

  // Reset array
  const resetArray = () => {
    const newArray = originalArray.map((value, index) => ({
      value,
      index,
      state: "default" as const,
    }))
    setArray(newArray)
    setCurrentStep(0)
    setSteps([])
    setIsPlaying(false)
  }

  // Toggle play/pause
  const togglePlay = () => {
    if (steps.length === 0) {
      generateSteps()
    }
    setIsPlaying(!isPlaying)
  }

  // Animation effect
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return

    const timer = setTimeout(
      () => {
        if (currentStep < steps.length - 1) {
          const nextStep = currentStep + 1
          setCurrentStep(nextStep)
          setArray(steps[nextStep].array)

          const step = steps[nextStep]

          // Play appropriate sound
          if (step.found) {
            playSound("found")
          } else if (step.comparison === "equal") {
            playSound("found")
          } else if (step.comparison === "less" || step.comparison === "greater") {
            playSound("eliminate")
          } else if (step.middle >= 0) {
            playSound("compare", 300 + step.array[step.middle].value * 2)
          } else if (nextStep === steps.length - 1 && !step.found) {
            playSound("notfound")
          }
        } else {
          setIsPlaying(false)
        }
      },
      1200 - speed[0] * 10,
    )

    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, steps, speed, playSound])

  // Initialize on mount
  useEffect(() => {
    initializeArray()
  }, [initializeArray])

  // Get bar color based on state
  const getBarColor = (state: ArrayElement["state"]) => {
    switch (state) {
      case "left":
        return "bg-blue-500"
      case "right":
        return "bg-purple-500"
      case "middle":
        return "bg-yellow-500"
      case "found":
        return "bg-green-500"
      case "eliminated":
        return "bg-gray-300"
      default:
        return "bg-gray-400"
    }
  }

  const maxValue = Math.max(...array.map((el) => el.value), 1)
  const currentStepInfo = steps[currentStep]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Binary Search Visualizer</h1>
        <p className="text-muted-foreground">Watch how binary search efficiently finds elements in sorted arrays</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Configure your binary search visualization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Array Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sorted Array (comma-separated)</label>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="10, 23, 35, 42, 56, 67, 78, 89, 95"
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

            {/* Target Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Value</label>
              <Input
                type="number"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                placeholder="Enter target value"
              />
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Speed: {speed[0]}%</label>
              <Slider value={speed} onValueChange={setSpeed} max={100} min={10} step={10} className="w-full" />
            </div>

            {/* Sound Controls */}
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

            {/* Playback Controls */}
            <div className="flex gap-2">
              <Button onClick={togglePlay} className="flex-1">
                {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isPlaying ? "Pause" : "Search"}
              </Button>
              <Button onClick={resetArray} variant="outline">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button onClick={() => setIsPlaying(false)} variant="outline">
                <Square className="w-4 h-4" />
              </Button>
            </div>

            {/* Statistics */}
            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm">
                <span className="font-medium">Step:</span> {currentStep + 1} / {steps.length || 1}
              </div>
              <div className="text-sm">
                <span className="font-medium">Target:</span> {target}
              </div>
              <div className="text-sm">
                <span className="font-medium">Array Size:</span> {array.length}
              </div>
              {currentStepInfo && (
                <>
                  <div className="text-sm">
                    <span className="font-medium">Iterations:</span> {currentStepInfo.iterations}
                  </div>
                  {currentStepInfo.left >= 0 && currentStepInfo.right >= 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Range:</span> [{currentStepInfo.left}, {currentStepInfo.right}]
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Legend</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded"></div>
                  <span>Unsearched</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Left Pointer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Right Pointer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Middle</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Found</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <span>Eliminated</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Binary Search Visualization</CardTitle>
            <CardDescription>Watch the algorithm efficiently narrow down the search space</CardDescription>
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
                  Enter a sorted array to start searching
                </div>
              ) : (
                array.map((element, index) => (
                  <div key={index} className="flex flex-col items-center gap-1 transition-all duration-300">
                    <div
                      className={`w-12 rounded-t transition-all duration-300 ${getBarColor(element.state)}`}
                      style={{
                        height: `${(element.value / maxValue) * 300}px`,
                        minHeight: "30px",
                      }}
                    />
                    <span className="text-xs font-mono text-center w-12">{element.value}</span>
                    <span className="text-xs text-muted-foreground w-12 text-center">[{index}]</span>
                  </div>
                ))
              )}
            </div>

            {/* Search Progress */}
            {currentStepInfo && (
              <div className="flex justify-center items-center gap-4 text-sm">
                {currentStepInfo.left >= 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Left: {currentStepInfo.left}</span>
                  </div>
                )}
                {currentStepInfo.middle >= 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>Middle: {currentStepInfo.middle}</span>
                  </div>
                )}
                {currentStepInfo.right >= 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>Right: {currentStepInfo.right}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Information */}
      <Card>
        <CardHeader>
          <CardTitle>Binary Search Algorithm Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium">Time Complexity</h4>
              <p className="text-sm text-muted-foreground">O(log n) - Very efficient!</p>
            </div>
            <div>
              <h4 className="font-medium">Space Complexity</h4>
              <p className="text-sm text-muted-foreground">O(1) - Constant space</p>
            </div>
            <div>
              <h4 className="font-medium">Requirements</h4>
              <p className="text-sm text-muted-foreground">Array must be sorted beforehand</p>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">How it works:</h4>
            <p className="text-sm text-muted-foreground">
              Binary search repeatedly divides the search space in half by comparing the target with the middle element.
              If the target is smaller, search the left half; if larger, search the right half. This eliminates half the
              remaining elements in each step, making it extremely efficient for large datasets.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
