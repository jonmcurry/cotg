"""
APBA Baseball Binary Parser
Reverse engineers APBA PLAYERS.DAT files to understand player card structure

Author: Century of the Game Development Team
Date: January 27, 2026
"""

import struct
import json
import sys
from pathlib import Path
from typing import Dict, List, Any


class APBAPlayerParser:
    """Parse APBA Baseball PLAYERS.DAT binary files"""

    def __init__(self, dat_file_path: str):
        self.dat_file_path = Path(dat_file_path)
        self.players = []

    def parse_file(self) -> List[Dict[str, Any]]:
        """Parse the entire PLAYERS.DAT file"""

        with open(self.dat_file_path, 'rb') as f:
            data = f.read()

        print(f"File size: {len(data)} bytes")

        # From hex dump analysis, each record appears to be ~150-180 bytes
        # Let's analyze the structure
        self.analyze_structure(data)

        return self.players

    def analyze_structure(self, data: bytes):
        """Analyze the binary structure to understand record layout"""

        print("\n=== APBA PLAYERS.DAT Structure Analysis ===\n")

        # From hex dump, we can see:
        # Offset 0x00: Length byte (0x07 = 7 chars for "LEIBOLD")
        # Offset 0x01-0x10: Last name (padded with spaces)
        # Offset 0x11: Length byte (0x04 = 4 chars for "Nemo")
        # Offset 0x12-0x21: First name (padded with spaces)
        # Then numeric data follows

        offset = 0
        record_num = 0

        while offset < len(data):
            if offset + 150 > len(data):  # Safety check
                break

            try:
                player = self.parse_player_record(data[offset:offset+200])
                if player:
                    self.players.append(player)
                    record_num += 1

                    # Print first few players for analysis
                    if record_num <= 10:
                        print(f"\nPlayer {record_num}:")
                        print(f"  Name: {player['last_name']}, {player['first_name']}")
                        print(f"  Position String (raw): '{player['position_string']}'")
                        print(f"  Position: {player['position']}")
                        print(f"  Grade: {player['grade']}")
                        print(f"  Bats: {player['bats']} Throws: {player['throws']}")
                        print(f"  Card: {player['card_number']}")

                # Record size is exactly 146 bytes (0x92)
                offset += 146

            except Exception as e:
                print(f"Error at offset {offset}: {e}")
                offset += 1

        print(f"\n=== Total players parsed: {len(self.players)} ===")

    def parse_player_record(self, record: bytes) -> Dict[str, Any]:
        """Parse a single player record

        Record structure (146 bytes total = 0x92):
        0x00: Last name length (1 byte)
        0x01-0x0F: Last name (15 bytes, space-padded)
        0x10: First name length (1 byte)
        0x11-0x1F: First name (15 bytes, space-padded)
        0x20-0x7F: Ratings and batting chart data
        0x80-0x91: Position string and additional data
        """

        RECORD_SIZE = 146

        if len(record) < RECORD_SIZE:
            return None

        player = {}

        try:
            # Last name
            last_name_len = record[0x00]
            if last_name_len > 0 and last_name_len < 20:
                last_name = record[0x01:0x01+15].decode('ascii', errors='ignore').strip()
                player['last_name'] = last_name
            else:
                return None  # Invalid record

            # First name
            first_name_len = record[0x10]
            if first_name_len > 0 and first_name_len < 20:
                first_name = record[0x11:0x11+15].decode('ascii', errors='ignore').strip()
                player['first_name'] = first_name
            else:
                player['first_name'] = ""

            # Skip records with no name
            if not player['last_name']:
                return None

            # Position string - need to look earlier to get full position
            # The 0x0A at 0x87 is a marker, actual position starts before that
            # Let's try from 0x86 to catch the full position code
            pos_string = record[0x86:0x92].decode('ascii', errors='ignore').strip()

            # Split on spaces and filter empty strings
            parts = [p for p in pos_string.split(' ') if p]

            # Extract position (first element)
            if len(parts) >= 1:
                player['position'] = parts[0]
            else:
                player['position'] = 'UNK'

            # Extract grade number (2nd element)
            grade = parts[1] if len(parts) >= 2 else '0'

            # Extract bats (3rd element)
            if len(parts) >= 3:
                player['bats'] = parts[2]
            else:
                player['bats'] = 'R'

            # Extract card number (4th element)
            if len(parts) >= 4:
                player['card_number'] = parts[3]
            else:
                player['card_number'] = '0'

            # Store grade
            player['grade'] = grade

            # Throws - look for patterns, often same as bats
            player['throws'] = player['bats']

            # Numeric ratings at specific offsets
            # These need more analysis to understand fully
            player['raw_ratings'] = {
                'byte_0x20': record[0x20],
                'byte_0x21': record[0x21],
                'byte_0x22': record[0x22],
                'byte_0x23': record[0x23],
                'byte_0x24': record[0x24],
                'byte_0x25': record[0x25],
            }

            # Batting chart (dice outcomes)
            # APBA uses dice rolls 2-12 (2d6), with outcomes for each
            # These bytes encode the outcome table
            batting_chart = []
            for i in range(0x30, 0x80):  # Extended range to capture full chart
                batting_chart.append(record[i])

            player['batting_chart_raw'] = batting_chart

            # Store full position string for reference
            player['position_string'] = pos_string

            return player

        except Exception as e:
            # Silent failure for malformed records
            return None

    def export_to_json(self, output_file: str):
        """Export parsed players to JSON"""

        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(self.players, f, indent=2)

        print(f"\nExported {len(self.players)} players to {output_path}")


def main():
    """Main entry point"""

    if len(sys.argv) < 2:
        print("Usage: python parse_apba_binary.py <path_to_PLAYERS.DAT>")
        print("\nExample:")
        print("  python parse_apba_binary.py C:/dosgames/shared/BBW/1921S.WDD/PLAYERS.DAT")
        sys.exit(1)

    dat_file = sys.argv[1]

    if not Path(dat_file).exists():
        print(f"Error: File not found: {dat_file}")
        sys.exit(1)

    # Parse the file
    parser = APBAPlayerParser(dat_file)
    players = parser.parse_file()

    # Export to JSON
    season_name = Path(dat_file).parent.name  # e.g., "1921S.WDD"
    output_file = f"c:/Users/jonmc/dev/cotg/data_files/apba_parsed/{season_name}_players.json"
    parser.export_to_json(output_file)

    print("\n=== Parsing Complete ===")
    print(f"Found {len(players)} players")
    print(f"Output: {output_file}")


if __name__ == "__main__":
    main()
