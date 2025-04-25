// Types
export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface Topic {
  name: string;
  information: string;
  key_quotes: string[];
  time_ranges: { start: string; end: string }[];
  category?: string;
}

export interface SegmentGroup {
  firstSegment: TranscriptSegment;
  lastSegment: TranscriptSegment;
  segments: TranscriptSegment[];
}

// Utility functions
export const parseTimestamp = (timestamp: string): number => {
  const parts = timestamp.split(':');
  let seconds = 0;
  if (parts.length === 2) {
    seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return seconds;
};

export const formatTime = (seconds: number): string => {
  if (seconds < 0) seconds = 0; // Handle potential negative values if needed

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const parseTranscript = (text: string, isDebug = false): TranscriptSegment[] => {
  const debugLog = (...args: unknown[]) => {
    if (isDebug) {
      console.log(...args);
    }
  };

  debugLog("Parsing transcript text:", text);
  const lines = text.split('\n');
  const segments: TranscriptSegment[] = [];
  let currentSegment: TranscriptSegment | null = null;

  lines.forEach((line, index) => {
    debugLog(`Processing line ${index + 1}:`, line);
    const timestampMatch = line.match(/(?:(\d{2}):)?(\d{2}:\d{2})-(?:(\d{2}):)?(\d{2}:\d{2})/);
    if (timestampMatch) {
      debugLog("Timestamp match found:", timestampMatch[0]);
      if (currentSegment) {
        debugLog("Pushing previous segment:", currentSegment);
        segments.push(currentSegment);
      }
      const startStr = timestampMatch[1] ? `${timestampMatch[1]}:${timestampMatch[2]}` : timestampMatch[2];
      const endStr = timestampMatch[3] ? `${timestampMatch[3]}:${timestampMatch[4]}` : timestampMatch[4];

      const startTime = parseTimestamp(startStr);
      const endTime = parseTimestamp(endStr);
      currentSegment = {
        startTime: startTime,
        endTime: endTime,
        text: line.replace(timestampMatch[0], '').trim()
      };
      debugLog("Created new segment:", currentSegment);
    } else if (currentSegment && line.trim() !== '') {
      debugLog("Appending text to current segment:", line.trim());
      currentSegment.text += ' ' + line.trim();
    } else {
      debugLog("Skipping line (no timestamp match or empty line):", line);
    }
  });

  if (currentSegment) {
    debugLog("Pushing final segment:", currentSegment);
    segments.push(currentSegment);
  }

  debugLog("Parsed transcript segments:", segments);
  return segments;
};

// Helper function to group consecutive segments from the filtered list
export const groupConsecutiveSegments = (
  allSegments: TranscriptSegment[],
  filteredSegments: TranscriptSegment[]
): SegmentGroup[] => {
  if (filteredSegments.length === 0) {
    return [];
  }

  const groups: SegmentGroup[] = [];
  if (allSegments.length === 0 || filteredSegments.length === 0) return groups;

  let currentGroup: TranscriptSegment[] = [];
  const segmentIndexMap = new Map(allSegments.map((seg, index) => [seg, index]));

  for (let i = 0; i < filteredSegments.length; i++) {
    const currentSegment = filteredSegments[i];
    const currentSegmentIndex = segmentIndexMap.get(currentSegment);

    if (currentGroup.length === 0) {
      // Start a new group
      currentGroup.push(currentSegment);
    } else {
      const prevSegmentInGroup = currentGroup[currentGroup.length - 1];
      const prevSegmentIndex = segmentIndexMap.get(prevSegmentInGroup);

      // Check if the current segment immediately follows the previous one in the *original* transcript
      // and if its index exists
      if (currentSegmentIndex !== undefined && prevSegmentIndex !== undefined && currentSegmentIndex === prevSegmentIndex + 1) {
        currentGroup.push(currentSegment);
      } else {
        // End the current group and start a new one
        if (currentGroup.length > 0) {
           groups.push({
            firstSegment: currentGroup[0],
            lastSegment: currentGroup[currentGroup.length - 1],
            segments: currentGroup,
          });
        }
        currentGroup = [currentSegment];
      }
    }
  }

  // Push the last group
  if (currentGroup.length > 0) {
    groups.push({
      firstSegment: currentGroup[0],
      lastSegment: currentGroup[currentGroup.length - 1],
      segments: currentGroup,
    });
  }

  return groups;
}; 