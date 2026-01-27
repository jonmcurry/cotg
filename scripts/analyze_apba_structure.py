"""
Analyze APBA PLAYERS.DAT to find exact record size
"""

def find_record_boundaries(filepath):
    """Find record boundaries by looking for name length byte patterns"""

    with open(filepath, 'rb') as f:
        data = f.read()

    print(f"File size: {len(data)} bytes\n")

    # Look for small byte values (2-15) that indicate name lengths
    # followed by ASCII letter patterns
    potential_starts = []

    for i in range(len(data) - 20):
        length_byte = data[i]

        # Check if this looks like a name length (3-12 typical)
        if 3 <= length_byte <= 15:
            # Check if next bytes are uppercase letters (player last names)
            next_bytes = data[i+1:i+6]
            if all(b in range(65, 91) or b == 32 for b in next_bytes):  # A-Z or space
                potential_starts.append(i)

    print(f"Found {len(potential_starts)} potential record starts\n")

    # Calculate distances between starts
    if len(potential_starts) > 10:
        distances = []
        for i in range(len(potential_starts) - 1):
            dist = potential_starts[i+1] - potential_starts[i]
            distances.append(dist)

        # Find most common distance
        from collections import Counter
        distance_counts = Counter(distances)
        most_common_distance = distance_counts.most_common(5)

        print("Most common distances between records:")
        for dist, count in most_common_distance:
            print(f"  {dist} bytes: {count} occurrences")

        # Show first 10 record starts
        print(f"\nFirst 15 record start offsets:")
        for i in range(min(15, len(potential_starts))):
            offset = potential_starts[i]
            name_len = data[offset]
            name = data[offset+1:offset+16].decode('ascii', errors='ignore').strip()
            print(f"  0x{offset:04X} ({offset:5d}): len={name_len:2d} name='{name}'")


if __name__ == "__main__":
    filepath = r"C:\dosgames\shared\BBW\1921S.WDD\PLAYERS.DAT"
    find_record_boundaries(filepath)
