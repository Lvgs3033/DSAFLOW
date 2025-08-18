"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpDown,
  Route,
  Search,
  Crown,
  GitBranch,
  Shuffle,
  ChevronRight,
  Code,
  Sparkles,
  Zap,
  Target,
} from "lucide-react"

// Import all visualizer components
import SortingVisualizer from "@/components/sorting-visualizer"
import GraphVisualizer from "@/components/graph-visualizer"
import BinarySearchVisualizer from "@/components/binary-search-visualizer"
import NQueensVisualizer from "@/components/n-queens-visualizer"
import BinaryTreeVisualizer from "@/components/binary-tree-visualizer"
import DFSBFSVisualizer from "@/components/dfs-bfs-visualizer"
import AlgorithmCodeReference from "@/components/algorithm-code-reference"

type VisualizerType =
  | "dashboard"
  | "sorting"
  | "graph"
  | "binary-search"
  | "n-queens"
  | "binary-tree"
  | "dfs-bfs"
  | "code-reference"

interface AlgorithmCard {
  id: VisualizerType
  title: string
  description: string
  icon: React.ReactNode
  category: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  algorithms: string[]
  color: string
}

const algorithmCards: AlgorithmCard[] = [
  {
    id: "sorting",
    title: "Array Sorting Algorithms",
    description:
      "Visualize how different sorting algorithms work step by step with sound effects and detailed analysis.",
    icon: <ArrowUpDown className="w-6 h-6" />,
    category: "Sorting & Searching",
    difficulty: "Beginner",
    algorithms: ["Bubble Sort", "Selection Sort", "Insertion Sort", "Merge Sort", "Quick Sort"],
    color: "bg-blue-500",
  },
  {
    id: "binary-search",
    title: "Binary Search Algorithm",
    description:
      "Watch binary search efficiently find elements in sorted arrays by eliminating half the search space each step.",
    icon: <Search className="w-6 h-6" />,
    category: "Sorting & Searching",
    difficulty: "Beginner",
    algorithms: ["Binary Search"],
    color: "bg-green-500",
  },
  {
    id: "graph",
    title: "Graph Shortest Path",
    description: "Explore pathfinding algorithms that find the shortest route between two points in a graph.",
    icon: <Route className="w-6 h-6" />,
    category: "Graph Algorithms",
    difficulty: "Intermediate",
    algorithms: ["Dijkstra's Algorithm", "A* Algorithm"],
    color: "bg-purple-500",
  },
  {
    id: "dfs-bfs",
    title: "Graph Traversal (DFS/BFS)",
    description: "Compare depth-first and breadth-first search algorithms for exploring graphs and trees.",
    icon: <GitBranch className="w-6 h-6" />,
    category: "Graph Algorithms",
    difficulty: "Intermediate",
    algorithms: ["Depth-First Search", "Breadth-First Search"],
    color: "bg-indigo-500",
  },
  {
    id: "binary-tree",
    title: "Binary Tree Operations",
    description: "Visualize binary search trees and different traversal methods with interactive tree building.",
    icon: <Shuffle className="w-6 h-6" />,
    category: "Tree Algorithms",
    difficulty: "Intermediate",
    algorithms: ["In-order", "Pre-order", "Post-order", "BST Operations"],
    color: "bg-teal-500",
  },
  {
    id: "n-queens",
    title: "N-Queens Problem",
    description: "Watch the backtracking algorithm solve the classic N-Queens puzzle with constraint satisfaction.",
    icon: <Crown className="w-6 h-6" />,
    category: "Backtracking",
    difficulty: "Advanced",
    algorithms: ["Backtracking", "Constraint Satisfaction"],
    color: "bg-orange-500",
  },
  {
    id: "code-reference",
    title: "Algorithm Code Reference",
    description:
      "Complete implementations of all algorithms in C++, Java, Python, and JavaScript with copy functionality.",
    icon: <Code className="w-6 h-6" />,
    category: "Code Reference",
    difficulty: "Beginner",
    algorithms: ["All Algorithms", "Multiple Languages", "Copy & Paste Ready"],
    color: "bg-slate-500",
  },
]

const categories = [
  "All",
  "Sorting & Searching",
  "Graph Algorithms",
  "Tree Algorithms",
  "Backtracking",
  "Code Reference",
]

export default function Home() {
  const [currentView, setCurrentView] = useState<VisualizerType>("dashboard")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const filteredCards = algorithmCards.filter(
    (card) => selectedCategory === "All" || card.category === selectedCategory,
  )

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "Advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  if (currentView !== "dashboard") {
    const renderVisualizer = () => {
      switch (currentView) {
        case "sorting":
          return <SortingVisualizer />
        case "graph":
          return <GraphVisualizer />
        case "binary-search":
          return <BinarySearchVisualizer />
        case "n-queens":
          return <NQueensVisualizer />
        case "binary-tree":
          return <BinaryTreeVisualizer />
        case "dfs-bfs":
          return <DFSBFSVisualizer />
        case "code-reference":
          return <AlgorithmCodeReference />
        default:
          return null
      }
    }

    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <Button
            onClick={() => setCurrentView("dashboard")}
            variant="outline"
            className="mb-6 hover:scale-105 transition-all duration-200 hover:shadow-md font-sans"
          >
            ← Back to Dashboard
          </Button>
          <div className="animate-fade-in">{renderVisualizer()}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div className={`text-center space-y-6 ${isLoaded ? "animate-fade-in" : "opacity-0"}`}>
          <div className="relative">
            <h1 className="text-6xl md:text-7xl font-serif font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-glow">
              DSAFlow
            </h1>
            <div className="absolute -top-4 -right-4 animate-bounce-gentle">
              <Sparkles className="w-8 h-8 text-primary/60" />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              Visualize. Understand. Master.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto font-sans leading-relaxed">
              Interactive visualizations of fundamental computer science algorithms. Watch, learn, and understand how
              algorithms work step by step with sound effects and detailed explanations.
            </p>
          </div>
        </div>

        <div
          className={`flex flex-wrap justify-center gap-3 ${isLoaded ? "animate-slide-up" : "opacity-0"}`}
          style={{ animationDelay: "0.2s" }}
        >
          {categories.map((category, index) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="hover:scale-105 transition-all duration-200 font-sans shadow-sm hover:shadow-md"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCards.map((card, index) => (
            <Card
              key={card.id}
              className={`group hover:shadow-2xl transition-all duration-500 cursor-pointer border-2 hover:border-primary/30 hover:scale-105 bg-card/50 backdrop-blur-sm ${
                isLoaded ? "animate-scale-in" : "opacity-0"
              }`}
              style={{ animationDelay: `${0.1 * index + 0.3}s` }}
              onClick={() => setCurrentView(card.id)}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`p-4 rounded-xl ${card.color} text-white shadow-lg group-hover:shadow-xl transition-all duration-300 animate-float`}
                  >
                    {card.icon}
                  </div>
                  <Badge className={`${getDifficultyColor(card.difficulty)} font-medium`}>{card.difficulty}</Badge>
                </div>
                <div>
                  <CardTitle className="text-xl font-serif group-hover:text-primary transition-colors duration-300">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="mt-3 text-sm font-sans leading-relaxed">
                    {card.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 font-sans">Algorithms:</p>
                  <div className="flex flex-wrap gap-2">
                    {card.algorithms.map((algorithm) => (
                      <Badge
                        key={algorithm}
                        variant="secondary"
                        className="text-xs font-sans hover:bg-secondary/20 transition-colors"
                      >
                        {algorithm}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <Badge variant="outline" className="text-xs font-sans">
                    {card.category}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div
          className={`mt-20 space-y-12 ${isLoaded ? "animate-slide-up" : "opacity-0"}`}
          style={{ animationDelay: "0.6s" }}
        >
          <div className="text-center">
            <h2 className="text-4xl font-serif font-bold text-foreground">Why Use Algorithm Visualizers?</h2>
            <p className="text-muted-foreground mt-4 text-lg font-sans max-w-2xl mx-auto">
              Understanding algorithms through visualization makes complex concepts accessible and memorable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Step-by-Step Learning",
                description:
                  "Watch algorithms execute one step at a time with detailed explanations of what's happening at each stage.",
                icon: <Target className="w-6 h-6" />,
              },
              {
                title: "Interactive Controls",
                description:
                  "Adjust speed, input your own data, and control the visualization to match your learning pace.",
                icon: <Zap className="w-6 h-6" />,
              },
              {
                title: "Audio Feedback",
                description:
                  "Sound effects provide additional feedback, making the learning experience more engaging and memorable.",
                icon: <Sparkles className="w-6 h-6" />,
              },
            ].map((feature, index) => (
              <Card
                key={feature.title}
                className="hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm animate-scale-in"
                style={{ animationDelay: `${0.2 * index + 0.8}s` }}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">{feature.icon}</div>
                    <CardTitle className="text-lg font-serif">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div
          className={`bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-2xl p-10 text-center border border-primary/10 ${isLoaded ? "animate-fade-in" : "opacity-0"}`}
          style={{ animationDelay: "1s" }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "7", label: "Sections" },
              { value: "15+", label: "Algorithms" },
              { value: "5", label: "Categories" },
              { value: "∞", label: "Learning" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="animate-bounce-gentle"
                style={{ animationDelay: `${0.2 * index + 1.2}s` }}
              >
                <div className="text-3xl md:text-4xl font-serif font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-sans mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`text-center text-sm text-muted-foreground pt-12 border-t border-border/50 ${isLoaded ? "animate-fade-in" : "opacity-0"}`}
          style={{ animationDelay: "1.4s" }}
        >
          <p className="font-sans">
            DSAFlow - Built with React, TypeScript, and Tailwind CSS. Interactive algorithm visualizations for computer
            science education.
          </p>
        </div>
      </div>
    </main>
  )
}
