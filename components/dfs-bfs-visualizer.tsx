"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Square, RotateCcw, Plus, Shuffle, Volume2, VolumeX } from "lucide-react"

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  state: "unvisited" | "visiting" | "visited" | "current" | "start"
}

interface GraphEdge {
  from: string
  to: string
}

interface TraversalStep {
  nodes: GraphNode[]
  edges: GraphEdge[]
  currentNode: string | null
  visitedNodes: string[]
  dataStructure: string[] // Stack for DFS, Queue for BFS
  traversalOrder: string[]
  action: "start" | "visit" | "backtrack" | "complete"
  description: string
}

type Algorithm = "dfs" | "bfs"

export default function DFSBFSVisualizer() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [algorithm, setAlgorithm] = useState<Algorithm>("dfs")
  const [startNode, setStartNode] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState([50])
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<TraversalStep[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState([40])
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [isAddingEdge, setIsAddingEdge] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  const playSound = useCallback(
    (type: "visit" | "backtrack" | "complete" | "add", pitch?: number) => {
      if (!soundEnabled) return

      const audioContext = initAudioContext()
      if (!audioContext) return

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const baseVolume = (volume[0] / 100) * 0.06

      switch (type) {
        case "visit":
          oscillator.frequency.setValueAtTime(300 + (pitch || 0) * 50, audioContext.currentTime)
          oscillator.type = "sine"
          gainNode.gain.setValueAtTime(baseVolume * 0.4, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
          break

        case "backtrack":
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(250, audioContext.currentTime + 0.2)
          oscillator.type = "sawtooth"
          gainNode.gain.setValueAtTime(baseVolume * 0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
          break

        case "add":
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime)
          oscillator.type = "triangle"
          gainNode.gain.setValueAtTime(baseVolume * 0.2, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.1)
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
            gain.gain.setValueAtTime(baseVolume * 0.25, audioContext.currentTime + index * 0.1)
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6)
            osc.start(audioContext.currentTime + index * 0.1)
            osc.stop(audioContext.currentTime + 0.6)
          })
          break
      }
    },
    [soundEnabled, volume, initAudioContext],
  )

  // Initialize with a sample graph
  const initializeSampleGraph = useCallback(() => {
    const sampleNodes: GraphNode[] = [
      { id: "A", label: "A", x: 200, y: 100, state: "unvisited" },
      { id: "B", label: "B", x: 100, y: 200, state: "unvisited" },
      { id: "C", label: "C", x: 300, y: 200, state: "unvisited" },
      { id: "D", label: "D", x: 50, y: 300, state: "unvisited" },
      { id: "E", label: "E", x: 150, y: 300, state: "unvisited" },
      { id: "F", label: "F", x: 250, y: 300, state: "unvisited" },
      { id: "G", label: "G", x: 350, y: 300, state: "unvisited" },
    ]

    const sampleEdges: GraphEdge[] = [
      { from: "A", to: "B" },
      { from: "A", to: "C" },
      { from: "B", to: "D" },
      { from: "B", to: "E" },
      { from: "C", to: "F" },
      { from: "C", to: "G" },
      { from: "E", to: "F" },
    ]

    setNodes(sampleNodes)
    setEdges(sampleEdges)
    setStartNode("A")
    setSteps([])
    setCurrentStep(0)
    setIsPlaying(false)
  }, [])

  // Generate random graph
  const generateRandomGraph = () => {
    const nodeCount = 6 + Math.floor(Math.random() * 4) // 6-9 nodes
    const newNodes: GraphNode[] = []

    // Create nodes in a circular pattern
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * 2 * Math.PI
      const radius = 120
      const centerX = 200
      const centerY = 200

      newNodes.push({
        id: String.fromCharCode(65 + i), // A, B, C, etc.
        label: String.fromCharCode(65 + i),
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        state: "unvisited",
      })
    }

    // Create random edges
    const newEdges: GraphEdge[] = []
    const edgeCount = nodeCount + Math.floor(Math.random() * nodeCount) // Ensure connectivity

    for (let i = 0; i < edgeCount; i++) {
      const from = newNodes[Math.floor(Math.random() * nodeCount)]
      const to = newNodes[Math.floor(Math.random() * nodeCount)]

      if (
        from.id !== to.id &&
        !newEdges.some(
          (edge) => (edge.from === from.id && edge.to === to.id) || (edge.from === to.id && edge.to === from.id),
        )
      ) {
        newEdges.push({ from: from.id, to: to.id })
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
    setStartNode(newNodes[0].id)
    setSteps([])
    setCurrentStep(0)
    setIsPlaying(false)
  }

  // Get neighbors of a node
  const getNeighbors = useCallback(
    (nodeId: string): string[] => {
      const neighbors: string[] = []
      edges.forEach((edge) => {
        if (edge.from === nodeId) {
          neighbors.push(edge.to)
        } else if (edge.to === nodeId) {
          neighbors.push(edge.from)
        }
      })
      return neighbors.sort() // Sort for consistent ordering
    },
    [edges],
  )

  // DFS Algorithm
  const depthFirstSearch = useCallback(
    (startNodeId: string): TraversalStep[] => {
      const steps: TraversalStep[] = []
      const visited = new Set<string>()
      const stack: string[] = [startNodeId]
      const traversalOrder: string[] = []

      // Initial step
      steps.push({
        nodes: nodes.map((node) => ({
          ...node,
          state: node.id === startNodeId ? "start" : "unvisited",
        })),
        edges: [...edges],
        currentNode: null,
        visitedNodes: [],
        dataStructure: [startNodeId],
        traversalOrder: [],
        action: "start",
        description: `Starting DFS from node ${startNodeId}. Stack: [${startNodeId}]`,
      })

      while (stack.length > 0) {
        const currentNodeId = stack.pop()!

        if (!visited.has(currentNodeId)) {
          visited.add(currentNodeId)
          traversalOrder.push(currentNodeId)

          // Visit current node
          steps.push({
            nodes: nodes.map((node) => ({
              ...node,
              state: visited.has(node.id) ? (node.id === currentNodeId ? "current" : "visited") : "unvisited",
            })),
            edges: [...edges],
            currentNode: currentNodeId,
            visitedNodes: Array.from(visited),
            dataStructure: [...stack],
            traversalOrder: [...traversalOrder],
            action: "visit",
            description: `Visiting node ${currentNodeId}. Stack: [${stack.join(", ")}]`,
          })

          // Add neighbors to stack (in reverse order for consistent left-to-right traversal)
          const neighbors = getNeighbors(currentNodeId).reverse()
          neighbors.forEach((neighbor) => {
            if (!visited.has(neighbor)) {
              stack.push(neighbor)
            }
          })

          if (neighbors.length > 0) {
            steps.push({
              nodes: nodes.map((node) => ({
                ...node,
                state: visited.has(node.id) ? (node.id === currentNodeId ? "current" : "visited") : "unvisited",
              })),
              edges: [...edges],
              currentNode: currentNodeId,
              visitedNodes: Array.from(visited),
              dataStructure: [...stack],
              traversalOrder: [...traversalOrder],
              action: "visit",
              description: `Added neighbors of ${currentNodeId} to stack. Stack: [${stack.join(", ")}]`,
            })
          }
        }
      }

      // Final step
      steps.push({
        nodes: nodes.map((node) => ({
          ...node,
          state: visited.has(node.id) ? "visited" : "unvisited",
        })),
        edges: [...edges],
        currentNode: null,
        visitedNodes: Array.from(visited),
        dataStructure: [],
        traversalOrder: [...traversalOrder],
        action: "complete",
        description: `DFS complete! Traversal order: [${traversalOrder.join(", ")}]`,
      })

      return steps
    },
    [nodes, edges, getNeighbors],
  )

  // BFS Algorithm
  const breadthFirstSearch = useCallback(
    (startNodeId: string): TraversalStep[] => {
      const steps: TraversalStep[] = []
      const visited = new Set<string>()
      const queue: string[] = [startNodeId]
      const traversalOrder: string[] = []

      // Initial step
      steps.push({
        nodes: nodes.map((node) => ({
          ...node,
          state: node.id === startNodeId ? "start" : "unvisited",
        })),
        edges: [...edges],
        currentNode: null,
        visitedNodes: [],
        dataStructure: [startNodeId],
        traversalOrder: [],
        action: "start",
        description: `Starting BFS from node ${startNodeId}. Queue: [${startNodeId}]`,
      })

      while (queue.length > 0) {
        const currentNodeId = queue.shift()!

        if (!visited.has(currentNodeId)) {
          visited.add(currentNodeId)
          traversalOrder.push(currentNodeId)

          // Visit current node
          steps.push({
            nodes: nodes.map((node) => ({
              ...node,
              state: visited.has(node.id) ? (node.id === currentNodeId ? "current" : "visited") : "unvisited",
            })),
            edges: [...edges],
            currentNode: currentNodeId,
            visitedNodes: Array.from(visited),
            dataStructure: [...queue],
            traversalOrder: [...traversalOrder],
            action: "visit",
            description: `Visiting node ${currentNodeId}. Queue: [${queue.join(", ")}]`,
          })

          // Add neighbors to queue
          const neighbors = getNeighbors(currentNodeId)
          neighbors.forEach((neighbor) => {
            if (!visited.has(neighbor) && !queue.includes(neighbor)) {
              queue.push(neighbor)
            }
          })

          if (neighbors.length > 0) {
            steps.push({
              nodes: nodes.map((node) => ({
                ...node,
                state: visited.has(node.id) ? (node.id === currentNodeId ? "current" : "visited") : "unvisited",
              })),
              edges: [...edges],
              currentNode: currentNodeId,
              visitedNodes: Array.from(visited),
              dataStructure: [...queue],
              traversalOrder: [...traversalOrder],
              action: "visit",
              description: `Added neighbors of ${currentNodeId} to queue. Queue: [${queue.join(", ")}]`,
            })
          }
        }
      }

      // Final step
      steps.push({
        nodes: nodes.map((node) => ({
          ...node,
          state: visited.has(node.id) ? "visited" : "unvisited",
        })),
        edges: [...edges],
        currentNode: null,
        visitedNodes: Array.from(visited),
        dataStructure: [],
        traversalOrder: [...traversalOrder],
        action: "complete",
        description: `BFS complete! Traversal order: [${traversalOrder.join(", ")}]`,
      })

      return steps
    },
    [nodes, edges, getNeighbors],
  )

  // Generate algorithm steps
  const generateSteps = useCallback(() => {
    if (!startNode || nodes.length === 0) return

    let newSteps: TraversalStep[] = []

    switch (algorithm) {
      case "dfs":
        newSteps = depthFirstSearch(startNode)
        break
      case "bfs":
        newSteps = breadthFirstSearch(startNode)
        break
    }

    setSteps(newSteps)
    setCurrentStep(0)
  }, [startNode, nodes, algorithm, depthFirstSearch, breadthFirstSearch])

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    if (isAddingEdge) {
      if (selectedNodes.length === 0) {
        setSelectedNodes([nodeId])
      } else if (selectedNodes.length === 1 && selectedNodes[0] !== nodeId) {
        // Add edge
        const newEdge = { from: selectedNodes[0], to: nodeId }
        if (
          !edges.some(
            (edge) =>
              (edge.from === newEdge.from && edge.to === newEdge.to) ||
              (edge.from === newEdge.to && edge.to === newEdge.from),
          )
        ) {
          setEdges([...edges, newEdge])
          playSound("add")
        }
        setSelectedNodes([])
        setIsAddingEdge(false)
      }
    } else {
      setStartNode(nodeId)
    }
  }

  // Add new node
  const addNode = () => {
    const newNodeId = String.fromCharCode(65 + nodes.length)
    const newNode: GraphNode = {
      id: newNodeId,
      label: newNodeId,
      x: 200 + Math.random() * 200,
      y: 150 + Math.random() * 200,
      state: "unvisited",
    }
    setNodes([...nodes, newNode])
    if (!startNode) setStartNode(newNodeId)
  }

  // Clear graph
  const clearGraph = () => {
    setNodes([])
    setEdges([])
    setStartNode("")
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
          setNodes(step.nodes)

          // Play sound
          if (step.action === "visit") {
            playSound("visit", step.currentNode?.charCodeAt(0))
          } else if (step.action === "complete") {
            playSound("complete")
          }
        } else {
          setIsPlaying(false)
        }
      },
      1300 - speed[0] * 10,
    )

    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, steps, speed, playSound])

  // Initialize on mount
  useEffect(() => {
    initializeSampleGraph()
  }, [initializeSampleGraph])

  // Get node color based on state
  const getNodeColor = (state: GraphNode["state"]) => {
    switch (state) {
      case "start":
        return "#10b981" // emerald-500
      case "current":
        return "#f59e0b" // amber-500
      case "visited":
        return "#3b82f6" // blue-500
      case "visiting":
        return "#8b5cf6" // violet-500
      default:
        return "#6b7280" // gray-500
    }
  }

  const currentStepInfo = steps[currentStep]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">DFS/BFS Visualizer</h1>
        <p className="text-muted-foreground">Compare Depth-First Search and Breadth-First Search algorithms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Configure graph traversal</CardDescription>
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
                  <SelectItem value="dfs">Depth-First Search (DFS)</SelectItem>
                  <SelectItem value="bfs">Breadth-First Search (BFS)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Node Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Node</label>
              <Select value={startNode} onValueChange={setStartNode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select start node" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      Node {node.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Graph Operations */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={addNode} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Node
                </Button>
                <Button
                  onClick={() => setIsAddingEdge(!isAddingEdge)}
                  variant={isAddingEdge ? "default" : "outline"}
                  size="sm"
                >
                  Add Edge
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={generateRandomGraph} variant="outline" size="sm">
                  <Shuffle className="w-4 h-4 mr-1" />
                  Random
                </Button>
                <Button onClick={clearGraph} variant="outline" size="sm">
                  Clear All
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

            {/* Playback Controls */}
            <div className="space-y-2">
              <Button onClick={togglePlay} className="w-full" disabled={!startNode || nodes.length === 0}>
                {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isPlaying ? "Pause" : "Start Traversal"}
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => setIsPlaying(false)} variant="outline" size="sm">
                  <Square className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {
                    setSteps([])
                    setCurrentStep(0)
                    setIsPlaying(false)
                  }}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm">
                <span className="font-medium">Step:</span> {currentStep + 1} / {steps.length || 1}
              </div>
              <div className="text-sm">
                <span className="font-medium">Nodes:</span> {nodes.length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Edges:</span> {edges.length}
              </div>
              {currentStepInfo && (
                <>
                  <div className="text-sm">
                    <span className="font-medium">{algorithm === "dfs" ? "Stack" : "Queue"}:</span> [
                    {currentStepInfo.dataStructure.join(", ")}]
                  </div>
                  {currentStepInfo.traversalOrder.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Order:</span> [{currentStepInfo.traversalOrder.join(", ")}]
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span>Start Node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Visited</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span>Unvisited</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graph Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{algorithm === "dfs" ? "Depth-First Search" : "Breadth-First Search"}</CardTitle>
            <CardDescription>
              {isAddingEdge
                ? "Click two nodes to connect them with an edge"
                : "Click nodes to set start point, then run the algorithm"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStepInfo && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-center">{currentStepInfo.description}</p>
              </div>
            )}

            <div className="h-96 bg-muted/20 rounded-lg overflow-hidden relative">
              {nodes.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Add nodes to create your graph
                </div>
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 400 400">
                  {/* Render edges */}
                  {edges.map((edge, index) => {
                    const fromNode = nodes.find((n) => n.id === edge.from)
                    const toNode = nodes.find((n) => n.id === edge.to)
                    if (!fromNode || !toNode) return null

                    return (
                      <line
                        key={index}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke="#6b7280"
                        strokeWidth="2"
                      />
                    )
                  })}

                  {/* Render nodes */}
                  {nodes.map((node) => (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="20"
                        fill={getNodeColor(node.state)}
                        stroke={selectedNodes.includes(node.id) ? "#f59e0b" : "#374151"}
                        strokeWidth={selectedNodes.includes(node.id) ? "3" : "2"}
                        className="cursor-pointer transition-all duration-200"
                        onClick={() => handleNodeClick(node.id)}
                      />
                      <text
                        x={node.x}
                        y={node.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="14"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {node.label}
                      </text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>DFS vs BFS Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Depth-First Search (DFS)</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Data Structure:</span> Stack (LIFO)
                </div>
                <div>
                  <span className="font-medium">Time Complexity:</span> O(V + E)
                </div>
                <div>
                  <span className="font-medium">Space Complexity:</span> O(V)
                </div>
                <div>
                  <span className="font-medium">Use Cases:</span> Topological sorting, detecting cycles, pathfinding in
                  mazes
                </div>
                <div>
                  <span className="font-medium">Behavior:</span> Goes as deep as possible before backtracking
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Breadth-First Search (BFS)</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Data Structure:</span> Queue (FIFO)
                </div>
                <div>
                  <span className="font-medium">Time Complexity:</span> O(V + E)
                </div>
                <div>
                  <span className="font-medium">Space Complexity:</span> O(V)
                </div>
                <div>
                  <span className="font-medium">Use Cases:</span> Shortest path in unweighted graphs, level-order
                  traversal
                </div>
                <div>
                  <span className="font-medium">Behavior:</span> Explores all neighbors before going deeper
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
