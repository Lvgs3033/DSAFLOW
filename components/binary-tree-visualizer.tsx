"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Square, RotateCcw, Plus, Minus, Volume2, VolumeX, Shuffle } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface TreeNode {
  value: number
  left: TreeNode | null
  right: TreeNode | null
  x: number
  y: number
  id: string
  state: "default" | "visiting" | "visited" | "current" | "inserting" | "deleting"
}

interface TreeStep {
  tree: TreeNode | null
  currentNode: string | null
  visitedNodes: string[]
  traversalOrder: number[]
  action: "insert" | "delete" | "traverse" | "complete"
  description: string
  traversalType?: "inorder" | "preorder" | "postorder"
}

type TraversalType = "inorder" | "preorder" | "postorder"

export default function BinaryTreeVisualizer() {
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState([50])
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<TreeStep[]>([])
  const [traversalType, setTraversalType] = useState<TraversalType>("inorder")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState([40])
  const [nodeCounter, setNodeCounter] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  const playSound = useCallback(
    (type: "insert" | "delete" | "visit" | "complete", value?: number) => {
      if (!soundEnabled) return

      const audioContext = initAudioContext()
      if (!audioContext) return

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const baseVolume = (volume[0] / 100) * 0.07

      switch (type) {
        case "insert":
          oscillator.frequency.setValueAtTime(300 + (value || 50) * 3, audioContext.currentTime)
          oscillator.type = "sine"
          gainNode.gain.setValueAtTime(baseVolume * 0.5, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
          break

        case "delete":
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.4)
          oscillator.type = "sawtooth"
          gainNode.gain.setValueAtTime(baseVolume * 0.4, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.4)
          break

        case "visit":
          oscillator.frequency.setValueAtTime(200 + (value || 50) * 4, audioContext.currentTime)
          oscillator.type = "triangle"
          gainNode.gain.setValueAtTime(baseVolume * 0.3, audioContext.currentTime)
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

  // Create a new tree node
  const createNode = useCallback(
    (value: number): TreeNode => {
      const id = `node-${nodeCounter}`
      setNodeCounter((prev) => prev + 1)
      return {
        value,
        left: null,
        right: null,
        x: 0,
        y: 0,
        id,
        state: "default",
      }
    },
    [nodeCounter],
  )

  // Calculate tree positions
  const calculatePositions = useCallback((root: TreeNode | null, x = 400, y = 50, level = 0): TreeNode | null => {
    if (!root) return null

    const spacing = Math.max(50, 200 / (level + 1))
    root.x = x
    root.y = y

    if (root.left) {
      root.left = calculatePositions(root.left, x - spacing, y + 80, level + 1)
    }
    if (root.right) {
      root.right = calculatePositions(root.right, x + spacing, y + 80, level + 1)
    }

    return root
  }, [])

  // Deep clone tree
  const cloneTree = useCallback((node: TreeNode | null): TreeNode | null => {
    if (!node) return null
    return {
      ...node,
      left: cloneTree(node.left),
      right: cloneTree(node.right),
    }
  }, [])

  // Insert value into BST
  const insertIntoBST = useCallback(
    (root: TreeNode | null, value: number): TreeNode => {
      if (!root) {
        return createNode(value)
      }

      if (value < root.value) {
        root.left = insertIntoBST(root.left, value)
      } else if (value > root.value) {
        root.right = insertIntoBST(root.right, value)
      }

      return root
    },
    [createNode],
  )

  // Find minimum value node
  const findMin = useCallback((node: TreeNode): TreeNode => {
    while (node.left) {
      node = node.left
    }
    return node
  }, [])

  // Delete value from BST
  const deleteFromBST = useCallback(
    (root: TreeNode | null, value: number): TreeNode | null => {
      if (!root) return null

      if (value < root.value) {
        root.left = deleteFromBST(root.left, value)
      } else if (value > root.value) {
        root.right = deleteFromBST(root.right, value)
      } else {
        // Node to delete found
        if (!root.left && !root.right) {
          return null
        } else if (!root.left) {
          return root.right
        } else if (!root.right) {
          return root.left
        } else {
          // Node has two children
          const minRight = findMin(root.right)
          root.value = minRight.value
          root.right = deleteFromBST(root.right, minRight.value)
        }
      }

      return root
    },
    [findMin],
  )

  // Tree traversals
  const inorderTraversal = useCallback((root: TreeNode | null, result: TreeNode[] = []): TreeNode[] => {
    if (root) {
      inorderTraversal(root.left, result)
      result.push(root)
      inorderTraversal(root.right, result)
    }
    return result
  }, [])

  const preorderTraversal = useCallback((root: TreeNode | null, result: TreeNode[] = []): TreeNode[] => {
    if (root) {
      result.push(root)
      preorderTraversal(root.left, result)
      preorderTraversal(root.right, result)
    }
    return result
  }, [])

  const postorderTraversal = useCallback((root: TreeNode | null, result: TreeNode[] = []): TreeNode[] => {
    if (root) {
      postorderTraversal(root.left, result)
      postorderTraversal(root.right, result)
      result.push(root)
    }
    return result
  }, [])

  // Generate traversal steps
  const generateTraversalSteps = useCallback(() => {
    if (!tree) return

    const steps: TreeStep[] = []
    let traversalNodes: TreeNode[] = []

    switch (traversalType) {
      case "inorder":
        traversalNodes = inorderTraversal(tree)
        break
      case "preorder":
        traversalNodes = preorderTraversal(tree)
        break
      case "postorder":
        traversalNodes = postorderTraversal(tree)
        break
    }

    // Initial step
    steps.push({
      tree: calculatePositions(cloneTree(tree)),
      currentNode: null,
      visitedNodes: [],
      traversalOrder: [],
      action: "traverse",
      description: `Starting ${traversalType} traversal`,
      traversalType,
    })

    // Visit each node
    traversalNodes.forEach((node, index) => {
      const currentTree = cloneTree(tree)
      const visitedIds = traversalNodes.slice(0, index).map((n) => n.id)
      const traversalOrder = traversalNodes.slice(0, index + 1).map((n) => n.value)

      // Update node states
      const updateNodeStates = (node: TreeNode | null): TreeNode | null => {
        if (!node) return null

        const newNode = { ...node }
        if (visitedIds.includes(node.id)) {
          newNode.state = "visited"
        } else if (node.id === traversalNodes[index].id) {
          newNode.state = "current"
        } else {
          newNode.state = "default"
        }

        newNode.left = updateNodeStates(node.left)
        newNode.right = updateNodeStates(node.right)
        return newNode
      }

      const updatedTree = updateNodeStates(currentTree)

      steps.push({
        tree: calculatePositions(updatedTree),
        currentNode: node.id,
        visitedNodes: visitedIds,
        traversalOrder,
        action: "traverse",
        description: `Visiting node ${node.value} (step ${index + 1}/${traversalNodes.length})`,
        traversalType,
      })
    })

    // Final step
    const finalTree = cloneTree(tree)
    const updateFinalStates = (node: TreeNode | null): TreeNode | null => {
      if (!node) return null
      const newNode = { ...node }
      newNode.state = "visited"
      newNode.left = updateFinalStates(node.left)
      newNode.right = updateFinalStates(node.right)
      return newNode
    }

    steps.push({
      tree: calculatePositions(updateFinalStates(finalTree)),
      currentNode: null,
      visitedNodes: traversalNodes.map((n) => n.id),
      traversalOrder: traversalNodes.map((n) => n.value),
      action: "complete",
      description: `${traversalType} traversal complete! Order: [${traversalNodes.map((n) => n.value).join(", ")}]`,
      traversalType,
    })

    setSteps(steps)
    setCurrentStep(0)
  }, [tree, traversalType, inorderTraversal, preorderTraversal, postorderTraversal, calculatePositions, cloneTree])

  // Insert value
  const insertValue = () => {
    const value = Number.parseInt(inputValue)
    if (isNaN(value)) return

    const newTree = tree ? insertIntoBST(cloneTree(tree), value) : createNode(value)
    setTree(calculatePositions(newTree))
    setInputValue("")
    playSound("insert", value)
  }

  // Delete value
  const deleteValue = () => {
    const value = Number.parseInt(inputValue)
    if (isNaN(value) || !tree) return

    const newTree = deleteFromBST(cloneTree(tree), value)
    setTree(newTree ? calculatePositions(newTree) : null)
    setInputValue("")
    playSound("delete", value)
  }

  // Generate random tree
  const generateRandomTree = () => {
    let newTree: TreeNode | null = null
    const values = Array.from({ length: 7 + Math.floor(Math.random() * 6) }, () => Math.floor(Math.random() * 100) + 1)
    const uniqueValues = [...new Set(values)]

    uniqueValues.forEach((value) => {
      newTree = newTree ? insertIntoBST(newTree, value) : createNode(value)
    })

    setTree(calculatePositions(newTree))
  }

  // Clear tree
  const clearTree = () => {
    setTree(null)
    setSteps([])
    setCurrentStep(0)
    setIsPlaying(false)
  }

  // Toggle play/pause
  const togglePlay = () => {
    if (steps.length === 0) {
      generateTraversalSteps()
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
          if (step.tree) {
            setTree(step.tree)
          }

          // Play sound
          if (step.action === "traverse" && step.currentNode) {
            const currentNode = findNodeById(step.tree, step.currentNode)
            playSound("visit", currentNode?.value)
          } else if (step.action === "complete") {
            playSound("complete")
          }
        } else {
          setIsPlaying(false)
        }
      },
      1200 - speed[0] * 10,
    )

    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, steps, speed, playSound])

  // Find node by ID
  const findNodeById = (root: TreeNode | null, id: string): TreeNode | null => {
    if (!root) return null
    if (root.id === id) return root
    return findNodeById(root.left, id) || findNodeById(root.right, id)
  }

  // Render tree connections
  const renderConnections = (node: TreeNode | null): JSX.Element[] => {
    if (!node) return []

    const connections: JSX.Element[] = []

    if (node.left) {
      connections.push(
        <line
          key={`${node.id}-left`}
          x1={node.x}
          y1={node.y}
          x2={node.left.x}
          y2={node.left.y}
          stroke="#6b7280"
          strokeWidth="2"
        />,
      )
      connections.push(...renderConnections(node.left))
    }

    if (node.right) {
      connections.push(
        <line
          key={`${node.id}-right`}
          x1={node.x}
          y1={node.y}
          x2={node.right.x}
          y2={node.right.y}
          stroke="#6b7280"
          strokeWidth="2"
        />,
      )
      connections.push(...renderConnections(node.right))
    }

    return connections
  }

  // Render tree nodes
  const renderNodes = (node: TreeNode | null): JSX.Element[] => {
    if (!node) return []

    const nodes: JSX.Element[] = []

    // Get node color based on state
    const getNodeColor = (state: TreeNode["state"]) => {
      switch (state) {
        case "current":
          return "#fbbf24" // yellow-400
        case "visited":
          return "#10b981" // emerald-500
        case "visiting":
          return "#3b82f6" // blue-500
        case "inserting":
          return "#8b5cf6" // violet-500
        case "deleting":
          return "#ef4444" // red-500
        default:
          return "#6b7280" // gray-500
      }
    }

    nodes.push(
      <g key={node.id}>
        <circle cx={node.x} cy={node.y} r="20" fill={getNodeColor(node.state)} stroke="#374151" strokeWidth="2" />
        <text
          x={node.x}
          y={node.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
        >
          {node.value}
        </text>
      </g>,
    )

    nodes.push(...renderNodes(node.left))
    nodes.push(...renderNodes(node.right))

    return nodes
  }

  const currentStepInfo = steps[currentStep]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Binary Tree Visualizer</h1>
        <p className="text-muted-foreground">Visualize binary search trees and tree traversal algorithms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Manage your binary tree</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Value Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Node Value</label>
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter a number"
                onKeyPress={(e) => e.key === "Enter" && insertValue()}
              />
              <div className="flex gap-2">
                <Button onClick={insertValue} size="sm" className="flex-1">
                  <Plus className="w-4 h-4 mr-1" />
                  Insert
                </Button>
                <Button onClick={deleteValue} variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Minus className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Tree Operations */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={generateRandomTree} variant="outline" size="sm">
                  <Shuffle className="w-4 h-4 mr-1" />
                  Random Tree
                </Button>
                <Button onClick={clearTree} variant="outline" size="sm">
                  Clear All
                </Button>
              </div>
            </div>

            {/* Traversal Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Traversal Type</label>
              <Select value={traversalType} onValueChange={(value: TraversalType) => setTraversalType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inorder">In-order (Left, Root, Right)</SelectItem>
                  <SelectItem value="preorder">Pre-order (Root, Left, Right)</SelectItem>
                  <SelectItem value="postorder">Post-order (Left, Right, Root)</SelectItem>
                </SelectContent>
              </Select>
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
              <Button onClick={togglePlay} className="w-full" disabled={!tree}>
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
              {currentStepInfo && currentStepInfo.traversalOrder.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Order:</span> [{currentStepInfo.traversalOrder.join(", ")}]
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span>Unvisited</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span>Visited</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tree Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Binary Search Tree</CardTitle>
            <CardDescription>Interactive tree visualization with traversal algorithms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStepInfo && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-center">{currentStepInfo.description}</p>
              </div>
            )}

            <div className="h-96 bg-muted/20 rounded-lg overflow-hidden">
              {tree ? (
                <svg width="100%" height="100%" viewBox="0 0 800 400">
                  {renderConnections(tree)}
                  {renderNodes(tree)}
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Insert values to build your binary search tree
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Information */}
      <Card>
        <CardHeader>
          <CardTitle>Binary Tree Traversal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium">Time Complexity</h4>
              <p className="text-sm text-muted-foreground">O(n) - Visit each node once</p>
            </div>
            <div>
              <h4 className="font-medium">Space Complexity</h4>
              <p className="text-sm text-muted-foreground">O(h) - Recursive call stack height</p>
            </div>
            <div>
              <h4 className="font-medium">Applications</h4>
              <p className="text-sm text-muted-foreground">Expression evaluation, tree serialization</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2">In-order Traversal:</h4>
              <p className="text-sm text-muted-foreground">
                Left → Root → Right. For BST, visits nodes in ascending order.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Pre-order Traversal:</h4>
              <p className="text-sm text-muted-foreground">
                Root → Left → Right. Useful for copying/serializing trees.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Post-order Traversal:</h4>
              <p className="text-sm text-muted-foreground">Left → Right → Root. Useful for deleting trees safely.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
