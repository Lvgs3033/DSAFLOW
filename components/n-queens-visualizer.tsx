"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Square, RotateCcw, Crown, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react"

interface Cell {
  row: number
  col: number
  hasQueen: boolean
  isUnderAttack: boolean
  isCurrentPlacement: boolean
  isBacktracking: boolean
}

interface QueensStep {
  board: Cell[][]
  currentRow: number
  currentCol: number
  queens: { row: number; col: number }[]
  action: "place" | "backtrack" | "check" | "solution" | "complete"
  description: string
  solutionNumber?: number
  totalBacktracks: number
}

export default function NQueensVisualizer() {
  const [boardSize, setBoardSize] = useState(8)
  const [board, setBoard] = useState<Cell[][]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState([40])
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<QueensStep[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState([35])
  const [solutions, setSolutions] = useState<{ row: number; col: number }[][]>([])
  const [currentSolution, setCurrentSolution] = useState(0)
  const [showAllSolutions, setShowAllSolutions] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  const playSound = useCallback(
    (type: "place" | "backtrack" | "conflict" | "solution" | "complete", pitch?: number) => {
      if (!soundEnabled) return

      const audioContext = initAudioContext()
      if (!audioContext) return

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const baseVolume = (volume[0] / 100) * 0.06

      switch (type) {
        case "place":
          oscillator.frequency.setValueAtTime(400 + (pitch || 0) * 50, audioContext.currentTime)
          oscillator.type = "sine"
          gainNode.gain.setValueAtTime(baseVolume * 0.4, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
          break

        case "backtrack":
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3)
          oscillator.type = "sawtooth"
          gainNode.gain.setValueAtTime(baseVolume * 0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
          break

        case "conflict":
          oscillator.frequency.setValueAtTime(150, audioContext.currentTime)
          oscillator.type = "square"
          gainNode.gain.setValueAtTime(baseVolume * 0.2, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.15)
          break

        case "solution":
          const frequencies = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator()
            const gain = audioContext.createGain()
            osc.connect(gain)
            gain.connect(audioContext.destination)

            osc.frequency.setValueAtTime(freq, audioContext.currentTime)
            osc.type = "sine"
            gain.gain.setValueAtTime(baseVolume * 0.25, audioContext.currentTime + index * 0.1)
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8)
            osc.start(audioContext.currentTime + index * 0.1)
            osc.stop(audioContext.currentTime + 0.8)
          })
          break

        case "complete":
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.5)
          oscillator.type = "triangle"
          gainNode.gain.setValueAtTime(baseVolume * 0.4, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.5)
          break
      }
    },
    [soundEnabled, volume, initAudioContext],
  )

  // Initialize empty board
  const initializeBoard = useCallback(() => {
    const newBoard: Cell[][] = []
    for (let row = 0; row < boardSize; row++) {
      const boardRow: Cell[] = []
      for (let col = 0; col < boardSize; col++) {
        boardRow.push({
          row,
          col,
          hasQueen: false,
          isUnderAttack: false,
          isCurrentPlacement: false,
          isBacktracking: false,
        })
      }
      newBoard.push(boardRow)
    }
    setBoard(newBoard)
    setSteps([])
    setCurrentStep(0)
    setSolutions([])
    setCurrentSolution(0)
    setIsPlaying(false)
  }, [boardSize])

  // Check if placing a queen at (row, col) is safe
  const isSafe = useCallback((board: Cell[][], row: number, col: number, queens: { row: number; col: number }[]) => {
    // Check if any existing queen attacks this position
    for (const queen of queens) {
      // Same column
      if (queen.col === col) return false
      // Same row (shouldn't happen in our algorithm, but just in case)
      if (queen.row === row) return false
      // Diagonal
      if (Math.abs(queen.row - row) === Math.abs(queen.col - col)) return false
    }
    return true
  }, [])

  // Update board to show attacks
  const updateBoardAttacks = useCallback(
    (board: Cell[][], queens: { row: number; col: number }[]) => {
      // Reset all attack states
      for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
          board[row][col].isUnderAttack = false
          board[row][col].hasQueen = false
          board[row][col].isCurrentPlacement = false
          board[row][col].isBacktracking = false
        }
      }

      // Place queens
      queens.forEach((queen) => {
        board[queen.row][queen.col].hasQueen = true
      })

      // Mark attacked squares
      queens.forEach((queen) => {
        // Mark row and column
        for (let i = 0; i < boardSize; i++) {
          if (i !== queen.col) board[queen.row][i].isUnderAttack = true
          if (i !== queen.row) board[i][queen.col].isUnderAttack = true
        }

        // Mark diagonals
        for (let i = 0; i < boardSize; i++) {
          for (let j = 0; j < boardSize; j++) {
            if (i !== queen.row && j !== queen.col && Math.abs(i - queen.row) === Math.abs(j - queen.col)) {
              board[i][j].isUnderAttack = true
            }
          }
        }
      })

      return board
    },
    [boardSize],
  )

  // N-Queens backtracking algorithm
  const solveNQueens = useCallback(() => {
    const steps: QueensStep[] = []
    const allSolutions: { row: number; col: number }[][] = []
    let totalBacktracks = 0

    const createBoard = (): Cell[][] => {
      const newBoard: Cell[][] = []
      for (let row = 0; row < boardSize; row++) {
        const boardRow: Cell[] = []
        for (let col = 0; col < boardSize; col++) {
          boardRow.push({
            row,
            col,
            hasQueen: false,
            isUnderAttack: false,
            isCurrentPlacement: false,
            isBacktracking: false,
          })
        }
        newBoard.push(boardRow)
      }
      return newBoard
    }

    const solve = (queens: { row: number; col: number }[], row: number): boolean => {
      // Base case: all queens placed
      if (row === boardSize) {
        const solutionBoard = createBoard()
        updateBoardAttacks(solutionBoard, queens)
        allSolutions.push([...queens])

        steps.push({
          board: solutionBoard.map((row) => [...row]),
          currentRow: row - 1,
          currentCol: -1,
          queens: [...queens],
          action: "solution",
          description: `Solution ${allSolutions.length} found! All ${boardSize} queens placed safely.`,
          solutionNumber: allSolutions.length,
          totalBacktracks,
        })
        return true
      }

      // Try placing queen in each column of current row
      for (let col = 0; col < boardSize; col++) {
        const currentBoard = createBoard()
        updateBoardAttacks(currentBoard, queens)
        currentBoard[row][col].isCurrentPlacement = true

        steps.push({
          board: currentBoard.map((row) => [...row]),
          currentRow: row,
          currentCol: col,
          queens: [...queens],
          action: "check",
          description: `Trying to place queen at position (${row}, ${col})`,
          totalBacktracks,
        })

        if (isSafe(currentBoard, row, col, queens)) {
          // Place queen
          const newQueens = [...queens, { row, col }]
          const placedBoard = createBoard()
          updateBoardAttacks(placedBoard, newQueens)

          steps.push({
            board: placedBoard.map((row) => [...row]),
            currentRow: row,
            currentCol: col,
            queens: [...newQueens],
            action: "place",
            description: `Queen placed at (${row}, ${col}). Moving to next row.`,
            totalBacktracks,
          })

          // Recursively solve for next row
          if (solve(newQueens, row + 1)) {
            if (showAllSolutions)
              continue // Continue to find all solutions
            else return true // Return after first solution
          }

          // Backtrack
          totalBacktracks++
          const backtrackBoard = createBoard()
          updateBoardAttacks(backtrackBoard, queens)
          backtrackBoard[row][col].isBacktracking = true

          steps.push({
            board: backtrackBoard.map((row) => [...row]),
            currentRow: row,
            currentCol: col,
            queens: [...queens],
            action: "backtrack",
            description: `Backtracking from (${row}, ${col}). No valid solution found in this branch.`,
            totalBacktracks,
          })
        } else {
          // Position not safe
          steps.push({
            board: currentBoard.map((row) => [...row]),
            currentRow: row,
            currentCol: col,
            queens: [...queens],
            action: "check",
            description: `Position (${row}, ${col}) is under attack. Trying next column.`,
            totalBacktracks,
          })
        }
      }

      return false
    }

    // Initial step
    const initialBoard = createBoard()
    steps.push({
      board: initialBoard.map((row) => [...row]),
      currentRow: 0,
      currentCol: -1,
      queens: [],
      action: "check",
      description: `Starting N-Queens algorithm for ${boardSize}×${boardSize} board`,
      totalBacktracks: 0,
    })

    solve([], 0)

    // Final step
    if (allSolutions.length > 0) {
      const finalBoard = createBoard()
      updateBoardAttacks(finalBoard, allSolutions[0])
      steps.push({
        board: finalBoard.map((row) => [...row]),
        currentRow: -1,
        currentCol: -1,
        queens: allSolutions[0],
        action: "complete",
        description: `Algorithm complete! Found ${allSolutions.length} solution${allSolutions.length > 1 ? "s" : ""} with ${totalBacktracks} backtracks.`,
        totalBacktracks,
      })
    } else {
      const finalBoard = createBoard()
      steps.push({
        board: finalBoard.map((row) => [...row]),
        currentRow: -1,
        currentCol: -1,
        queens: [],
        action: "complete",
        description: `No solutions found for ${boardSize}×${boardSize} board.`,
        totalBacktracks,
      })
    }

    setSolutions(allSolutions)
    return steps
  }, [boardSize, isSafe, updateBoardAttacks, showAllSolutions])

  // Generate algorithm steps
  const generateSteps = useCallback(() => {
    const newSteps = solveNQueens()
    setSteps(newSteps)
    setCurrentStep(0)
  }, [solveNQueens])

  // Toggle play/pause
  const togglePlay = () => {
    if (steps.length === 0) {
      generateSteps()
    }
    setIsPlaying(!isPlaying)
  }

  // Reset visualization
  const resetVisualization = () => {
    initializeBoard()
  }

  // Show specific solution
  const showSolution = (solutionIndex: number) => {
    if (solutions.length > solutionIndex) {
      const solutionBoard: Cell[][] = []
      for (let row = 0; row < boardSize; row++) {
        const boardRow: Cell[] = []
        for (let col = 0; col < boardSize; col++) {
          boardRow.push({
            row,
            col,
            hasQueen: false,
            isUnderAttack: false,
            isCurrentPlacement: false,
            isBacktracking: false,
          })
        }
        solutionBoard.push(boardRow)
      }

      updateBoardAttacks(solutionBoard, solutions[solutionIndex])
      setBoard(solutionBoard)
      setCurrentSolution(solutionIndex)
    }
  }

  // Animation effect
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return

    const timer = setTimeout(
      () => {
        if (currentStep < steps.length - 1) {
          const nextStep = currentStep + 1
          setCurrentStep(nextStep)
          setBoard(steps[nextStep].board)

          const step = steps[nextStep]

          // Play appropriate sound
          switch (step.action) {
            case "place":
              playSound("place", step.currentRow)
              break
            case "backtrack":
              playSound("backtrack")
              break
            case "check":
              if (step.description.includes("under attack")) {
                playSound("conflict")
              }
              break
            case "solution":
              playSound("solution")
              break
            case "complete":
              playSound("complete")
              break
          }
        } else {
          setIsPlaying(false)
        }
      },
      1300 - speed[0] * 10,
    )

    return () => clearTimeout(timer)
  }, [isPlaying, currentStep, steps, speed, playSound])

  // Initialize on mount and when board size changes
  useEffect(() => {
    initializeBoard()
  }, [initializeBoard])

  // Get cell styling
  const getCellStyle = (cell: Cell, rowIndex: number, colIndex: number) => {
    const isLight = (rowIndex + colIndex) % 2 === 0
    let baseColor = isLight ? "bg-amber-100" : "bg-amber-200"

    if (cell.hasQueen) {
      baseColor = "bg-purple-500"
    } else if (cell.isCurrentPlacement) {
      baseColor = "bg-blue-400"
    } else if (cell.isBacktracking) {
      baseColor = "bg-red-400"
    } else if (cell.isUnderAttack) {
      baseColor = isLight ? "bg-red-100" : "bg-red-200"
    }

    return `${baseColor} border border-amber-300 flex items-center justify-center transition-all duration-300`
  }

  const currentStepInfo = steps[currentStep]
  const cellSize = Math.max(40, Math.min(60, 480 / boardSize))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">N-Queens Visualizer</h1>
        <p className="text-muted-foreground">Watch the backtracking algorithm solve the classic N-Queens problem</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Configure N-Queens visualization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Board Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Board Size</label>
              <Select value={boardSize.toString()} onValueChange={(value) => setBoardSize(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4×4 (2 solutions)</SelectItem>
                  <SelectItem value="5">5×5 (10 solutions)</SelectItem>
                  <SelectItem value="6">6×6 (4 solutions)</SelectItem>
                  <SelectItem value="7">7×7 (40 solutions)</SelectItem>
                  <SelectItem value="8">8×8 (92 solutions)</SelectItem>
                  <SelectItem value="9">9×9 (352 solutions)</SelectItem>
                  <SelectItem value="10">10×10 (724 solutions)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Algorithm Options */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showAll"
                  checked={showAllSolutions}
                  onChange={(e) => setShowAllSolutions(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showAll" className="text-sm font-medium">
                  Find all solutions
                </label>
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
              <Button onClick={togglePlay} className="w-full">
                {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isPlaying ? "Pause" : "Start Algorithm"}
              </Button>
              <div className="flex gap-2">
                <Button onClick={resetVisualization} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button onClick={() => setIsPlaying(false)} variant="outline" size="sm">
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm">
                <span className="font-medium">Step:</span> {currentStep + 1} / {steps.length || 1}
              </div>
              <div className="text-sm">
                <span className="font-medium">Board Size:</span> {boardSize}×{boardSize}
              </div>
              <div className="text-sm">
                <span className="font-medium">Solutions Found:</span> {solutions.length}
              </div>
              {currentStepInfo && (
                <div className="text-sm">
                  <span className="font-medium">Backtracks:</span> {currentStepInfo.totalBacktracks}
                </div>
              )}
            </div>

            {/* Solution Navigation */}
            {solutions.length > 1 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium">Solutions ({solutions.length})</h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showSolution(Math.max(0, currentSolution - 1))}
                    disabled={currentSolution === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm flex-1 text-center">
                    {currentSolution + 1} / {solutions.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showSolution(Math.min(solutions.length - 1, currentSolution + 1))}
                    disabled={currentSolution === solutions.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Crown className="w-3 h-3 text-purple-600" />
                  <span>Queen</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-200 rounded"></div>
                  <span>Under Attack</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  <span>Current Try</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded"></div>
                  <span>Backtracking</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Board Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>N-Queens Board</CardTitle>
            <CardDescription>Watch the backtracking algorithm place queens safely</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStepInfo && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-center">{currentStepInfo.description}</p>
              </div>
            )}

            <div className="flex justify-center">
              <div
                className="grid gap-0 border-2 border-amber-400 rounded-lg overflow-hidden"
                style={{
                  gridTemplateColumns: `repeat(${boardSize}, ${cellSize}px)`,
                  width: `${boardSize * cellSize}px`,
                  height: `${boardSize * cellSize}px`,
                }}
              >
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={getCellStyle(cell, rowIndex, colIndex)}
                      style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                    >
                      {cell.hasQueen && <Crown className="w-6 h-6 text-white" />}
                    </div>
                  )),
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Algorithm Information */}
      <Card>
        <CardHeader>
          <CardTitle>N-Queens Problem Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium">Time Complexity</h4>
              <p className="text-sm text-muted-foreground">O(N!) - Factorial time in worst case</p>
            </div>
            <div>
              <h4 className="font-medium">Space Complexity</h4>
              <p className="text-sm text-muted-foreground">O(N) - Recursive call stack</p>
            </div>
            <div>
              <h4 className="font-medium">Algorithm Type</h4>
              <p className="text-sm text-muted-foreground">Backtracking with constraint satisfaction</p>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Problem Description:</h4>
            <p className="text-sm text-muted-foreground">
              The N-Queens problem asks: "How can N chess queens be placed on an N×N chessboard so that no two queens
              attack each other?" Queens can attack horizontally, vertically, and diagonally. The backtracking algorithm
              tries to place queens row by row, backtracking when no valid position is found.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
