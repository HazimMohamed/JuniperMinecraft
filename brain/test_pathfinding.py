#!/usr/bin/env python3
"""
Test A* pathfinding with a simple graph
"""

from brain import astar_pathfind, simplify_path, NavigationExpert

# Create a simple test graph
# Layout (Y=0):
#   0,0,0 - 1,0,0 - 2,0,0
#     |       |       |
#   0,0,1 - 1,0,1 - 2,0,1
#     |       |       |
#   0,0,2 - 1,0,2 - 2,0,2

test_graph = {
    "0,0,0": ["1,0,0", "0,0,1"],
    "1,0,0": ["0,0,0", "2,0,0", "1,0,1"],
    "2,0,0": ["1,0,0", "2,0,1"],
    "0,0,1": ["0,0,0", "1,0,1", "0,0,2"],
    "1,0,1": ["1,0,0", "0,0,1", "2,0,1", "1,0,2"],
    "2,0,1": ["2,0,0", "1,0,1", "2,0,2"],
    "0,0,2": ["0,0,1", "1,0,2"],
    "1,0,2": ["0,0,2", "1,0,1", "2,0,2"],
    "2,0,2": ["1,0,2", "2,0,1"]
}

print("Testing A* pathfinding...")
print("\nTest 1: Simple path from corner to corner")
path = astar_pathfind(test_graph, "0,0,0", "2,0,2")
print(f"Path: {path}")
print(f"Length: {len(path)} blocks")

simplified = simplify_path(path)
print(f"Simplified: {simplified}")
print(f"Reduced to {len(simplified)} waypoints")

print("\nTest 2: Using NavigationExpert")
expert = NavigationExpert()

observation = {
    'graph': test_graph,
    'botPosition': {'x': 0, 'y': 0, 'z': 0},
    'target': {'x': 2, 'y': 0, 'z': 2}
}

proposal = expert.get_proposal(observation)
print(f"Confidence: {proposal['confidence']}")
print(f"Reasoning: {proposal['reasoning']}")
print(f"Waypoints: {proposal['waypoints']}")

print("\nTest 3: No path (disconnected nodes)")
bad_graph = {
    "0,0,0": ["1,0,0"],
    "1,0,0": ["0,0,0"],
    "5,0,5": ["6,0,5"],
    "6,0,5": ["5,0,5"]
}
path = astar_pathfind(bad_graph, "0,0,0", "5,0,5")
print(f"Path result: {path}")

print("\n✅ All tests complete!")
