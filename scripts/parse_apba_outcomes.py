"""
APBA Outcome Table Parser
Parses the outcome tables to understand dice roll mappings

Author: Century of the Game Development Team
Date: January 27, 2026
"""

import struct
import json
from pathlib import Path
from typing import Dict, List, Tuple


class APBAOutcomeParser:
    """Parse APBA outcome tables"""

    def __init__(self, tables_dir: str):
        self.tables_dir = Path(tables_dir)
        self.outcomes = {}

    def parse_tables(self):
        """Parse all outcome table files"""

        print("=== APBA Outcome Tables Parser ===\n")

        # Parse numeric table
        self.parse_numeric_table()

        # Parse main outcome table
        self.parse_main_outcome_table()

        return self.outcomes

    def parse_numeric_table(self):
        """Parse B3EHNUM.TBL - numeric outcome table"""

        tbl_file = self.tables_dir / "B3EHNUM.TBL"
        msg_file = self.tables_dir / "B3EHNUM.MSG"

        print(f"Parsing {tbl_file.name}...")

        with open(tbl_file, 'rb') as f:
            tbl_data = f.read()

        with open(msg_file, 'rb') as f:
            msg_data = f.read()

        # File structure analysis
        print(f"  TBL size: {len(tbl_data)} bytes")
        print(f"  MSG size: {len(msg_data)} bytes")

        # Header appears to be at start
        # 'MTaN' signature at offset 0x04
        signature = tbl_data[4:8].decode('ascii', errors='ignore')
        print(f"  Signature: {signature}")

        # The table contains DWORD (4-byte) values
        # Starting after header (around offset 0x20)
        offset = 0x20
        outcome_index = 0
        numeric_outcomes = {}

        while offset < len(tbl_data) - 4:
            value = struct.unpack('<I', tbl_data[offset:offset+4])[0]

            if value == 0xFFFFFFFF:
                # Special marker - invalid/unused outcome
                pass
            elif value < len(msg_data):
                # This is a message offset
                # Try to extract text from MSG file
                try:
                    # Messages appear to be null-terminated or length-prefixed
                    msg_text = self.extract_message(msg_data, value)
                    if msg_text:
                        numeric_outcomes[outcome_index] = {
                            'code': outcome_index,
                            'offset': value,
                            'message': msg_text
                        }
                except:
                    pass

            outcome_index += 1
            offset += 4

        print(f"  Found {len(numeric_outcomes)} numeric outcomes\n")
        self.outcomes['numeric'] = numeric_outcomes

    def parse_main_outcome_table(self):
        """Parse B3EHMSG.TBL - main outcome messages"""

        tbl_file = self.tables_dir / "B3EHMSG.TBL"
        msg_file = self.tables_dir / "B3EHMSG.MSG"
        blk_file = self.tables_dir / "B3EHMSG.BLK"

        print(f"Parsing {tbl_file.name}...")

        with open(tbl_file, 'rb') as f:
            tbl_data = f.read()

        with open(msg_file, 'rb') as f:
            msg_data = f.read()

        print(f"  TBL size: {len(tbl_data)} bytes")
        print(f"  MSG size: {len(msg_data)} bytes")

        # Signature check
        signature = tbl_data[4:8].decode('ascii', errors='ignore')
        print(f"  Signature: {signature}")

        # The table starts with offset pointers (DWORDs)
        # Each entry is 4 bytes pointing to message text
        offset = 0x10  # Skip header
        outcome_index = 0
        main_outcomes = {}
        max_outcomes = min(200, (len(tbl_data) - offset) // 4)  # Limit to reasonable number

        for i in range(max_outcomes):
            msg_offset = struct.unpack('<I', tbl_data[offset:offset+4])[0]

            if msg_offset < len(msg_data):
                try:
                    msg_text = self.extract_message(msg_data, msg_offset, max_len=100)
                    if msg_text and len(msg_text) > 2:  # Skip empty/tiny messages
                        main_outcomes[outcome_index] = {
                            'code': outcome_index,
                            'offset': msg_offset,
                            'message': msg_text
                        }

                        # Print first 20 for analysis
                        if outcome_index < 20:
                            print(f"    [{outcome_index:3d}] 0x{msg_offset:06X}: {msg_text[:60]}")
                except:
                    pass

            outcome_index += 1
            offset += 4

        print(f"\n  Found {len(main_outcomes)} main outcomes\n")
        self.outcomes['main'] = main_outcomes

    def extract_message(self, data: bytes, offset: int, max_len: int = 200) -> str:
        """Extract null-terminated string from message data"""

        if offset >= len(data):
            return ""

        # Find null terminator or max length
        end = offset
        while end < min(offset + max_len, len(data)) and data[end] != 0:
            end += 1

        # Extract and clean the text
        try:
            text = data[offset:end].decode('ascii', errors='ignore')
            # Remove control characters but keep spaces
            text = ''.join(c if c.isprintable() or c == ' ' else '' for c in text)
            return text.strip()
        except:
            return ""

    def export_to_json(self, output_file: str):
        """Export parsed outcomes to JSON"""

        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(self.outcomes, f, indent=2)

        print(f"Exported outcomes to {output_path}")


def analyze_outcome_codes():
    """Analyze the relationship between player card bytes and outcomes"""

    print("\n=== Outcome Code Analysis ===\n")

    # Based on hex analysis of player cards:
    # Batting chart bytes at 0x30-0x7F map to dice roll outcomes

    # APBA dice system: 2d6 = rolls 2-12
    dice_rolls = {
        2: 1/36,   # 2.78% (one combination: 1+1)
        3: 2/36,   # 5.56% (1+2, 2+1)
        4: 3/36,   # 8.33% (1+3, 2+2, 3+1)
        5: 4/36,   # 11.11%
        6: 5/36,   # 13.89%
        7: 6/36,   # 16.67% (most common)
        8: 5/36,   # 13.89%
        9: 4/36,   # 11.11%
        10: 3/36,  # 8.33%
        11: 2/36,  # 5.56%
        12: 1/36,  # 2.78%
    }

    print("Dice Roll Probabilities (2d6):")
    for roll, prob in dice_rolls.items():
        combos = int(prob * 36)
        print(f"  Roll {roll:2d}: {prob*100:5.2f}% ({combos:2d} combinations)")

    print("\nPlayer Card Outcome Mapping:")
    print("  - Player card bytes encode outcomes for each dice result")
    print("  - Each byte value references an outcome from the tables")
    print("  - Grade A pitchers use their own card")
    print("  - Grade D/E pitchers defer to batter's card")
    print()


def main():
    """Main entry point"""

    tables_dir = r"C:\dosgames\shared\BBW\TABLES"

    if not Path(tables_dir).exists():
        print(f"Error: Tables directory not found: {tables_dir}")
        return

    # Parse outcome tables
    parser = APBAOutcomeParser(tables_dir)
    outcomes = parser.parse_tables()

    # Export to JSON
    output_file = r"c:\Users\jonmc\dev\cotg\data_files\apba_parsed\outcomes.json"
    parser.export_to_json(output_file)

    # Analyze outcome codes
    analyze_outcome_codes()

    print("\n=== Parsing Complete ===")


if __name__ == "__main__":
    main()
