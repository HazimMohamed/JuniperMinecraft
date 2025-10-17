#!/usr/bin/env python3
"""
Brain CLI - Receives observation from Node.js, runs pathfinding, returns waypoints
"""

import sys
import json
from brain import NavigationExpert

def main():
    # Read observation from stdin
    try:
        print('[Brain] Reading observation from stdin...', file=sys.stderr)
        observation_json = sys.stdin.read()
        observation = json.loads(observation_json)

        # Log what we received
        bot_pos = observation.get('botPosition', {})
        target = observation.get('target', {})
        graph_size = len(observation.get('graph', {}))

        print(f'[Brain] Bot position: ({bot_pos.get("x")}, {bot_pos.get("y")}, {bot_pos.get("z")})', file=sys.stderr)
        print(f'[Brain] Target: ({target.get("x")}, {target.get("y")}, {target.get("z")})', file=sys.stderr)
        print(f'[Brain] Graph size: {graph_size} nodes', file=sys.stderr)

    except Exception as e:
        print(f'[Brain] ERROR: Failed to parse input: {str(e)}', file=sys.stderr)
        print(json.dumps({'error': f'Failed to parse input: {str(e)}'}))
        sys.exit(1)

    # Create navigation expert
    print('[Brain] Creating NavigationExpert...', file=sys.stderr)
    expert = NavigationExpert()

    # Get pathfinding proposal
    try:
        print('[Brain] Running A* pathfinding...', file=sys.stderr)
        proposal = expert.get_proposal(observation)
        print(f'[Brain] Pathfinding result: {proposal["reasoning"]}', file=sys.stderr)
        print(f'[Brain] Confidence: {proposal["confidence"]}', file=sys.stderr)
        print(f'[Brain] Waypoints: {len(proposal["waypoints"])}', file=sys.stderr)

    except Exception as e:
        print(f'[Brain] ERROR: Pathfinding failed: {str(e)}', file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({'error': f'Pathfinding failed: {str(e)}'}))
        sys.exit(1)

    # Return waypoints as JSON
    result = {
        'waypoints': proposal['waypoints'],
        'confidence': proposal['confidence'],
        'reasoning': proposal['reasoning']
    }

    print('[Brain] Sending result to stdout...', file=sys.stderr)
    print(json.dumps(result))
    sys.exit(0)

if __name__ == '__main__':
    main()
