"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Square, RotateCcw, Trash2, MapPin, Flag, Volume2, VolumeX } from "lucide-react"

interface Node {
  id: string
  x: number
  y: number
  type: "normal" | "start" | "end" | "wall"
  distance: number
  previous: string | null
  visited: boolean
  inQueue: boolean
  isPath: boolean
}

interface Edge {
  from: string
  to: string
  weight: number
}

interface PathStep {
  currentNode: string
  visitedNodes: string[]
  queueNodes: string[]
  distances: { [key: string]: number }
  description: string
  pathFound?: boolean
  finalPath?: string[]
}

type Algorithm = "dijkstra" | "astar"

const GRID_SIZE = 20
const CELL_SIZE = 25

export default function GraphVisualizer() {
  const [nodes, setNodes] = useState<{ [key: string]: Node }>({})
  const [edges, setEdges] = useState<Edge[]>([])
  const [algorithm, setAlgorithm] = useState<Algorithm>("dijkstra")
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState([50])
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<PathStep[]>([])
  const [startNode, setStartNode] = useState<string | null>(null)
  const [endNode, setEndNode] = useState<string | null>(null)
  const [mode, setMode] = useState<"wall" | "start" | "end" | "clear">("wall")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState([30])
  const [isMouseDown, setIsMouseDown] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  const playSound = useCallback(
    (type: "visit" | "queue" | "path" | "complete", frequency?: number) => {
      if (!soundEnabled) return

      const audioContext = initAudioContext()
      if (!audioContext) return

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const baseVolume = (volume[0] / 100) * 0.05

      switch (type) {
        case "visit":
          oscillator.frequency.setValueAtTime(frequency || 400, audioContext.currentTime)
          oscillator.type = "sine"
          gainNode.gain.setValueAtTime(baseVolume * 0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.1)
          break

        case "queue":
          oscillator.frequency.setValueAtTime(frequency || 300, audioContext.currentTime)
          oscillator.type = "triangle"
          gainNode.gain.setValueAtTime(baseVolume * 0.2, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.08)
          break

        case "path":
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
          oscillator.type = "square"
          gainNode.gain.setValueAtTime(baseVolume * 0.4, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.15)
          break

        case "complete":
          const frequencies = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator()
            const gain = audioContext.createGain()
            osc.connect(gain)
            gain.connect(audioContext.destination)

            osc.frequency.setValueAtTime(freq, audioContext.currentTime)
            osc.type = "sine"
            gain.gain.setValueAtTime(baseVolume * 0.2, audioContext.currentTime + index * 0.1)
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6)
            osc.start(audioContext.currentTime + index * 0.1)
            osc.stop(audioContext.currentTime + 0.6)
          })
          break
      }
    },
    [soundEnabled, volume, initAudioContext],
  )

  // Initialize grid
  const initializeGrid = useCallback(() => {
    const newNodes: { [key: string]: Node } = {}

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const id = `${row}-${col}`
        newNodes[id] = {
          id,
          x: col,
          y: row,
          type: "normal",
          distance: Number.POSITIVE_INFINITY,
          previous: null,
          visited: false,
          inQueue: false,
          isPath: false,
        }
      }
    }

    setNodes(newNodes)
    setEdges([])
    setStartNode(null)
    setEndNode(null)
    setSteps([])
    setCurrentStep(0)
    setIsPlaying(false)
  }, [])

  // Get neighbors of a node
  const getNeighbors = useCallback(
    (nodeId: string): string[] => {
      const [row, col] = nodeId.split("-").map(Number)
      const neighbors: string[] = []

      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1], // 4-directional
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1], // diagonal
      ]

      directions.forEach(([dr, dc]) => {
        const newRow = row + dr
        const newCol = col + dc
        const neighborId = `${newRow}-${newCol}`

        if (
          newRow >= 0 &&
          newRow < GRID_SIZE &&
          newCol >= 0 &&
          newCol < GRID_SIZE &&
          nodes[neighborId] &&
          nodes[neighborId].type !== "wall"
        ) {
          neighbors.push(neighborId)
        }
      })

      return neighbors
    },
    [nodes],
  )

  // Calculate distance between two nodes
  const getDistance = useCallback((from: string, to: string): number => {
    const [fromRow, fromCol] = from.split("-").map(Number)
    const [toRow, toCol] = to.split("-").map(Number)

    const dx = Math.abs(fromCol - toCol)
    const dy = Math.abs(fromRow - toRow)

    // Diagonal movement costs more
    if (dx === 1 && dy === 1) return Math.sqrt(2)
    return 1
  }, [])

  // Heuristic for A* (Manhattan distance)
  const heuristic = useCallback((from: string, to: string): number => {
    const [fromRow, fromCol] = from.split("-").map(Number)
    const [toRow, toCol] = to.split("-").map(Number)
    return Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol)
  }, [])

  // Dijkstra's algorithm
  const dijkstra = useCallback(
    (start: string, end: string): PathStep[] => {
      const steps: PathStep[] = []
      const distances: { [key: string]: number } = {}
      const previous: { [key: string]: string | null } = {}
      const visited = new Set<string>()
      const queue = new Set<string>()

      // Initialize distances
      Object.keys(nodes).forEach((nodeId) => {
        distances[nodeId] = nodeId === start ? 0 : Number.POSITIVE_INFINITY
        previous[nodeId] = null
        if (nodes[nodeId].type !== "wall") {
          queue.add(nodeId)
        }
      })

      steps.push({
        currentNode: start,
        visitedNodes: [],
        queueNodes: Array.from(queue),
        distances: { ...distances },
        description: "Starting Dijkstra's algorithm from the start node",
      })

      while (queue.size > 0) {
        // Find node with minimum distance
        const current = Array.from(queue).reduce((min, nodeId) => (distances[nodeId] < distances[min] ? nodeId : min))

        queue.delete(current)
        visited.add(current)

        if (current === end) {
          // Reconstruct path
          const path: string[] = []
          let pathNode: string | null = end
          while (pathNode !== null) {
            path.unshift(pathNode)
            pathNode = previous[pathNode]
          }

          steps.push({
            currentNode: current,
            visitedNodes: Array.from(visited),
            queueNodes: Array.from(queue),
            distances: { ...distances },
            description: "Path found! Reconstructing shortest path",
            pathFound: true,
            finalPath: path,
          })
          break
        }

        steps.push({
          currentNode: current,
          visitedNodes: Array.from(visited),
          queueNodes: Array.from(queue),
          distances: { ...distances },
          description: `Visiting node ${current} (distance: ${distances[current].toFixed(1)})`,
        })

        // Check neighbors
        const neighbors = getNeighbors(current)
        neighbors.forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            const newDistance = distances[current] + getDistance(current, neighbor)
            if (newDistance < distances[neighbor]) {
              distances[neighbor] = newDistance
              previous[neighbor] = current

              steps.push({
                currentNode: current,
                visitedNodes: Array.from(visited),
                queueNodes: Array.from(queue),
                distances: { ...distances },
                description: `Updated distance to ${neighbor}: ${newDistance.toFixed(1)}`,
              })
            }
          }
        })
      }

      if (!steps[steps.length - 1]?.pathFound) {
        steps.push({
          currentNode: "",
          visitedNodes: Array.from(visited),
          queueNodes: [],
          distances: { ...distances },
          description: "No path found to the destination",
        })
      }

      return steps
    },
    [nodes, getNeighbors, getDistance],
  )

  // A* algorithm
  const aStar = useCallback(
    (start: string, end: string): PathStep[] => {
      const steps: PathStep[] = []
      const gScore: { [key: string]: number } = {}
      const fScore: { [key: string]: number } = {}
      const previous: { [key: string]: string | null } = {}
      const openSet = new Set<string>([start])
      const closedSet = new Set<string>()

      // Initialize scores
      Object.keys(nodes).forEach((nodeId) => {
        gScore[nodeId] = nodeId === start ? 0 : Number.POSITIVE_INFINITY
        fScore[nodeId] = nodeId === start ? heuristic(start, end) : Number.POSITIVE_INFINITY
        previous[nodeId] = null
      })

      steps.push({
        currentNode: start,
        visitedNodes: [],
        queueNodes: Array.from(openSet),
        distances: { ...gScore },
        description: "Starting A* algorithm with heuristic guidance",
      })

      while (openSet.size > 0) {
        // Find node with lowest fScore
        const current = Array.from(openSet).reduce((min, nodeId) => (fScore[nodeId] < fScore[min] ? nodeId : min))

        if (current === end) {
          // Reconstruct path
          const path: string[] = []
          let pathNode: string | null = end
          while (pathNode !== null) {
            path.unshift(pathNode)
            pathNode = previous[pathNode]
          }

          steps.push({
            currentNode: current,
            visitedNodes: Array.from(closedSet),
            queueNodes: Array.from(openSet),
            distances: { ...gScore },
            description: "Path found! A* completed successfully",
            pathFound: true,
            finalPath: path,
          })
          break
        }

        openSet.delete(current)
        closedSet.add(current)

        steps.push({
          currentNode: current,
          visitedNodes: Array.from(closedSet),
          queueNodes: Array.from(openSet),
          distances: { ...gScore },
          description: `Exploring node ${current} (f-score: ${fScore[current].toFixed(1)})`,
        })

        const neighbors = getNeighbors(current)
        neighbors.forEach((neighbor) => {
          if (closedSet.has(neighbor)) return

          const tentativeGScore = gScore[current] + getDistance(current, neighbor)

          if (!openSet.has(neighbor)) {
            openSet.add(neighbor)
          } else if (tentativeGScore >= gScore[neighbor]) {
            return
          }

          previous[neighbor] = current
          gScore[neighbor] = tentativeGScore
          fScore[neighbor] = gScore[neighbor] + heuristic(neighbor, end)

          steps.push({
            currentNode: current,
            visitedNodes: Array.from(closedSet),
            queueNodes: Array.from(openSet),
            distances: { ...gScore },
            description: `Updated neighbor ${neighbor} (g: ${gScore[neighbor].toFixed(1)}, f: ${fScore[neighbor].toFixed(1)})`,
          })
        })
      }

      if (!steps[steps.length - 1]?.pathFound) {
        steps.push({
          currentNode: "",
          visitedNodes: Array.from(closedSet),
          queueNodes: [],
          distances: { ...gScore },
          description: "No path found to the destination",
        })
      }

      return steps
    },
    [nodes, getNeighbors, getDistance, heuristic],
  )

  // Generate algorithm steps
  const generateSteps = useCallback(() => {
    if (!startNode || !endNode) {
      alert("Please set both start and end nodes")
      return
    }

    let newSteps: PathStep[] = []

    switch (algorithm) {
      case "dijkstra":
        newSteps = dijkstra(startNode, endNode)
        break
      case "astar":
        newSteps = aStar(startNode, endNode)
        break
    }

    setSteps(newSteps)
    setCurrentStep(0)
  }, [startNode, endNode, algorithm, dijkstra, aStar])

  // Handle cell click
  const handleCellClick = useCallback(
    (nodeId: string) => {
      if (isPlaying) return

      setNodes((prev) => {
        const newNodes = { ...prev }
        const node = newNodes[nodeId]

        switch (mode) {
          case "start":
            // Clear previous start
            if (startNode) {
              newNodes[startNode].type = "normal"
            }
            node.type = "start"
            setStartNode(nodeId)
            break
          case "end":
            // Clear previous end
            if (endNode) {
              newNodes[endNode].type = "normal"
            }
            node.type = "end"
            setEndNode(nodeId)
            break
          case "wall":
            if (node.type === "normal") {
              node.type = "wall"
            }
            break
          case "clear":
            if (node.type === "wall") {
              node.type = "normal"
            }
            break
        }

        return newNodes
      })
    },
    [mode, startNode, endNode, isPlaying],
  )

  // Handle mouse events for drawing
  const handleMouseDown = useCallback(
    (nodeId: string) => {
      setIsMouseDown(true)
      handleCellClick(nodeId)
    },
    [handleCellClick],
  )

  const handleMouseEnter = useCallback(
    (nodeId: string) => {
      if (isMouseDown && (mode === "wall" || mode === "clear")) {
        handleCellClick(nodeId)
      }
    },
    [isMouseDown, mode, handleCellClick],
  )

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false)
  }, [])

  // Clear walls
  const clearWalls = () => {
    setNodes((prev) => {
      const newNodes = { ...prev }
      Object.keys(newNodes).forEach((nodeId) => {
        if (newNodes[nodeId].type === "wall") {
          newNodes[nodeId].type = "normal"
        }
      })
      return newNodes
    })
  }

  // Reset visualization
  const resetVisualization = () => {
    setNodes((prev) => {
      const newNodes = { ...prev }
      Object.keys(newNodes).forEach((nodeId) => {
        newNodes[nodeId].visited = false
        newNodes[nodeId].inQueue = false
        newNodes[nodeId].isPath = false
        newNodes[nodeId].distance = Number.POSITIVE_INFINITY
        newNodes[nodeId].previous = null
      })
      return newNodes
    })
    setSteps([])
    setCurrentStep(0)
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

          const step = steps[nextStep]

          // Update node states
          setNodes((prev) => {
            const newNodes = { ...prev }

            // Reset states
            Object.keys(newNodes).forEach((nodeId) => {
              newNodes[nodeId].visited = false
              newNodes[nodeId].inQueue = false
              newNodes[nodeId].isPath = false
            })

            // Set visited nodes
            step.visitedNodes.forEach((nodeId) => {
              if (newNodes[nodeId]) {
                newNodes[nodeId].visited = true
              }
            })

            // Set queue nodes
            step.queueNodes.forEach((nodeId) => {
              if (newNodes[nodeId]) {
                newNodes[nodeId].inQueue = true
              }
            })

            // Set path nodes
            if (step.finalPath) {
              step.finalPath.forEach((nodeId) => {
                if (newNodes[nodeId]) {
                  newNodes[nodeId].isPath = true
                }
              })
            }

            return newNodes
          })

          // Play sounds
          if (step.finalPath) {
            playSound("complete")
          } else if (step.currentNode) {
            playSound("visit", 400 + Math.random() * 200)
          }
        } else {
          setIsPlaying(false)
        }
      },
      1100 - speed[0] * 10,
    )

    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, steps, speed, playSound])

  // Initialize on mount
  useEffect(() => {
    initializeGrid()
  }, [initializeGrid])

  // Get cell color
  const getCellColor = (node: Node) => {
    if (node.type === "start") return "bg-green-500"
    if (node.type === "end") return "bg-red-500"
    if (node.type === "wall") return "bg-gray-800"
    if (node.isPath) return "bg-yellow-400"
    if (node.visited) return "bg-blue-300"
    if (node.inQueue) return "bg-purple-300"
    return "bg-white border border-gray-300"
  }

  const currentStepInfo = steps[currentStep]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Graph Shortest Path Visualizer</h1>
        <p className="text-muted-foreground">Visualize pathfinding algorithms like Dijkstra's and A*</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Configure pathfinding visualization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Algorithm Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Algorithm</label>
              <Select value={algorithm} onValueChange={(value: Algorithm) => setAlgorithm(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dijkstra">Dijkstra's Algorithm</SelectItem>
                  <SelectItem value="astar">A* Algorithm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Drawing Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Drawing Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={mode === "start" ? "default" : "outline"} size="sm" onClick={() => setMode("start")}>
                  <MapPin className="w-4 h-4 mr-1" />
                  Start
                </Button>
                <Button variant={mode === "end" ? "default" : "outline"} size="sm" onClick={() => setMode("end")}>
                  <Flag className="w-4 h-4 mr-1" />
                  End
                </Button>
                <Button variant={mode === "wall" ? "default" : "outline"} size="sm" onClick={() => setMode("wall")}>
                  Wall
                </Button>
                <Button variant={mode === "clear" ? "default" : "outline"} size="sm" onClick={() => setMode("clear")}>
                  Clear
                </Button>
              </div>
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

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button onClick={togglePlay} className="w-full">
                {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isPlaying ? "Pause" : "Start Pathfinding"}
              </Button>
              <div className="flex gap-2">
                <Button onClick={resetVisualization} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button onClick={() => setIsPlaying(false)} variant="outline" size="sm">
                  <Square className="w-4 h-4" />
                </Button>
                <Button onClick={clearWalls} variant="outline" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm">
                <span className="font-medium">Step:</span> {currentStep + 1} / {steps.length || 1}
              </div>
              <div className="text-sm">
                <span className="font-medium">Start:</span> {startNode || "Not set"}
              </div>
              <div className="text-sm">
                <span className="font-medium">End:</span> {endNode || "Not set"}
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Start Node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>End Node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-800 rounded"></div>
                  <span>Wall</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-300 rounded"></div>
                  <span>In Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-300 rounded"></div>
                  <span>Visited</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                  <span>Shortest Path</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Visualization */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{algorithm === "dijkstra" ? "Dijkstra's" : "A*"} Algorithm Visualization</CardTitle>
            <CardDescription>Click and drag to create walls, set start/end points</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStepInfo && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-center">{currentStepInfo.description}</p>
              </div>
            )}

            <div
              className="grid gap-0 mx-auto border border-gray-400 bg-gray-100 p-2 rounded-lg"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                width: `${GRID_SIZE * CELL_SIZE + 16}px`,
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {Object.values(nodes).map((node) => (
                <div
                  key={node.id}
                  className={`cursor-pointer transition-all duration-200 ${getCellColor(node)}`}
                  style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
                  onMouseDown={() => handleMouseDown(node.id)}
                  onMouseEnter={() => handleMouseEnter(node.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Information */}
      <Card>
        <CardHeader>
          <CardTitle>Algorithm Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {algorithm === "dijkstra" && (
              <>
                <div>
                  <h4 className="font-medium">Time Complexity</h4>
                  <p className="text-sm text-muted-foreground">O((V + E) log V) with binary heap</p>
                </div>
                <div>
                  <h4 className="font-medium">Space Complexity</h4>
                  <p className="text-sm text-muted-foreground">O(V)</p>
                </div>
                <div>
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Finds shortest path by exploring nodes in order of distance from start.
                  </p>
                </div>
              </>
            )}
            {algorithm === "astar" && (
              <>
                <div>
                  <h4 className="font-medium">Time Complexity</h4>
                  <p className="text-sm text-muted-foreground">O(b^d) where b is branching factor</p>
                </div>
                <div>
                  <h4 className="font-medium">Space Complexity</h4>
                  <p className="text-sm text-muted-foreground">O(b^d)</p>
                </div>
                <div>
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Uses heuristic to guide search toward goal, often faster than Dijkstra's.
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
