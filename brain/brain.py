"""
Juniper Bot Brain - Hierarchical Agent Architecture

Executive coordinates Expert systems that propose actions.
Experts use pathfinding and decision-making to guide the bot.
Motor control executes low-level movement.
"""

import heapq
import math
from typing import Dict, List, Tuple, Optional


def heuristic(pos1: Tuple[int, int, int], pos2: Tuple[int, int, int]) -> float:
    """Calculate 3D Euclidean distance heuristic for A*"""
    dx = pos1[0] - pos2[0]
    dy = pos1[1] - pos2[1]
    dz = pos1[2] - pos2[2]
    return math.sqrt(dx*dx + dy*dy + dz*dz)


def astar_pathfind(graph: Dict[str, List[str]], start: str, goal: str) -> Optional[List[str]]:
    """
    A* pathfinding algorithm

    Args:
        graph: Adjacency list {node: [neighbor1, neighbor2, ...]}
        start: Start node key "x,y,z"
        goal: Goal node key "x,y,z"

    Returns:
        List of node keys representing path, or None if no path found
    """
    if start not in graph or goal not in graph:
        return None

    # Parse positions for heuristic
    def parse_pos(key: str) -> Tuple[int, int, int]:
        parts = key.split(',')
        return (int(parts[0]), int(parts[1]), int(parts[2]))

    start_pos = parse_pos(start)
    goal_pos = parse_pos(goal)

    # Priority queue: (f_score, node)
    open_set = [(0, start)]
    came_from = {}

    # g_score: cost from start to node
    g_score = {start: 0}

    # f_score: g_score + heuristic
    f_score = {start: heuristic(start_pos, goal_pos)}

    visited = set()

    while open_set:
        current_f, current = heapq.heappop(open_set)

        if current in visited:
            continue

        visited.add(current)

        # Found goal!
        if current == goal:
            # Reconstruct path
            path = []
            node = current
            while node in came_from:
                path.append(node)
                node = came_from[node]
            path.append(start)
            path.reverse()
            return path

        # Explore neighbors
        if current not in graph:
            continue

        for neighbor in graph[current]:
            if neighbor in visited:
                continue

            # Cost to move between adjacent nodes is 1
            tentative_g = g_score[current] + 1

            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                neighbor_pos = parse_pos(neighbor)
                f = tentative_g + heuristic(neighbor_pos, goal_pos)
                f_score[neighbor] = f
                heapq.heappush(open_set, (f, neighbor))

    # No path found
    return None


def simplify_path(path: List[str]) -> List[str]:
    """
    Simplify path by removing collinear waypoints
    Keeps only: start, direction changes, and goal
    """
    if len(path) <= 2:
        return path

    simplified = [path[0]]

    for i in range(1, len(path) - 1):
        prev = path[i - 1].split(',')
        curr = path[i].split(',')
        next_node = path[i + 1].split(',')

        # Calculate direction vectors
        dir1 = (int(curr[0]) - int(prev[0]),
                int(curr[1]) - int(prev[1]),
                int(curr[2]) - int(prev[2]))
        dir2 = (int(next_node[0]) - int(curr[0]),
                int(next_node[1]) - int(curr[1]),
                int(next_node[2]) - int(curr[2]))

        # Keep waypoint if direction changed
        if dir1 != dir2:
            simplified.append(path[i])

    simplified.append(path[-1])
    return simplified


class Executive:
    """Coordinates experts and decides which actions to take"""

    def __init__(self):
        self.navigation_expert = NavigationExpert()
        self.survival_expert = SurvivalExpert()
        self.exploration_expert = ExplorationExpert()

    def decide(self, world_state, expert_proposals):
        """Select which expert to follow based on priorities"""
        # TODO: Implement decision logic
        pass


class NavigationExpert:
    """Handles pathfinding to target locations using A*"""

    def get_proposal(self, observation):
        """
        Generate navigation proposal with confidence score

        Args:
            observation: Dict with 'graph', 'botPosition', 'target'

        Returns:
            Dict with 'waypoints', 'confidence', 'reasoning'
        """
        if 'graph' not in observation or 'target' not in observation:
            return {
                'waypoints': [],
                'confidence': 0.0,
                'reasoning': 'Missing graph or target data'
            }

        graph = observation['graph']
        bot_pos = observation['botPosition']
        target = observation['target']

        # Convert positions to graph keys
        start_key = f"{int(bot_pos['x'])},{int(bot_pos['y'])},{int(bot_pos['z'])}"
        goal_key = f"{int(target['x'])},{int(target['y'])},{int(target['z'])}"

        # Run A* pathfinding
        path = astar_pathfind(graph, start_key, goal_key)

        if path is None:
            return {
                'waypoints': [],
                'confidence': 0.0,
                'reasoning': 'No path found'
            }

        # Simplify path to key waypoints
        simplified = simplify_path(path)

        # Convert back to position dicts
        waypoints = []
        for node_key in simplified:
            parts = node_key.split(',')
            waypoints.append({
                'x': int(parts[0]),
                'y': int(parts[1]),
                'z': int(parts[2])
            })

        return {
            'waypoints': waypoints,
            'confidence': 0.9,
            'reasoning': f'Path found: {len(path)} blocks, {len(waypoints)} waypoints'
        }


class SurvivalExpert:
    """Handles health, hunger, and threat avoidance"""

    def get_proposal(self, observation):
        """Generate survival action proposal"""
        # TODO: Implement survival logic
        pass


class ExplorationExpert:
    """Finds interesting areas and resources"""

    def get_proposal(self, observation):
        """Generate exploration direction proposal"""
        # TODO: Implement exploration logic
        pass


class MotorControl:
    """Executes low-level movement commands"""

    def execute(self, current_pos, target_waypoint, terrain):
        """Convert waypoint to physical actions (forward, jump, yaw, pitch)"""
        # TODO: Implement motor control
        pass


if __name__ == '__main__':
    print("Juniper Brain initialized")
    executive = Executive()
