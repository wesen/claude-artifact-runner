import { useState, useRef, useMemo } from 'react';
// Import the prompt text as a raw string
import promptText from '../../tests/transcript-editor/prompt.txt?raw';

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

interface TimeRange {
  start: number;
  end: number;
}

interface Topic {
  name: string;
  information: string;
  key_quotes: string[];
  time_ranges: { start: string; end: string }[];
  category?: string;
}

interface SegmentGroup {
  firstSegment: TranscriptSegment;
  lastSegment: TranscriptSegment;
  segments: TranscriptSegment[];
}

const TranscriptAnalyzer = () => {
  const [transcript, setTranscript] = useState('');
  const [parsedTranscript, setParsedTranscript] = useState<TranscriptSegment[]>([]);
  const [topics, setTopics] = useState<{ specific_topics: Topic[]; general_topics: Topic[] }>({ specific_topics: [], general_topics: [] });
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicRanges, setTopicRanges] = useState<TimeRange[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  // State for copy feedback
  const [promptCopied, setPromptCopied] = useState(false);
  const [topicInfoCopied, setTopicInfoCopied] = useState(false);
  const [transcriptViewCopied, setTranscriptViewCopied] = useState(false);

  const parseTimestamp = (timestamp: string) => {
    const parts = timestamp.split(':');
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return seconds;
  };

  const parseTranscript = (text: string): TranscriptSegment[] => {
    console.log("Parsing transcript text:", text);
    const lines = text.split('\n');
    const segments: TranscriptSegment[] = [];
    let currentSegment: TranscriptSegment | null = null;

    lines.forEach((line, index) => {
      console.log(`Processing line ${index + 1}:`, line);
      const timestampMatch = line.match(/(?:(\d{2}):)?(\d{2}:\d{2})-(?:(\d{2}):)?(\d{2}:\d{2})/);
      if (timestampMatch) {
        console.log("Timestamp match found:", timestampMatch[0]);
        if (currentSegment) {
          console.log("Pushing previous segment:", currentSegment);
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
        console.log("Created new segment:", currentSegment);
      } else if (currentSegment && line.trim() !== '') {
        console.log("Appending text to current segment:", line.trim());
        currentSegment.text += ' ' + line.trim();
      } else {
        console.log("Skipping line (no timestamp match or empty line):", line);
      }
    });

    if (currentSegment) {
      console.log("Pushing final segment:", currentSegment);
      segments.push(currentSegment);
    }

    console.log("Parsed transcript segments:", segments);
    return segments;
  };

  const handleTranscriptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      setTranscript(text);
      setParsedTranscript(parseTranscript(text));
    };
    reader.readAsText(file);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setTopics(json);
        // Reset selected topic and ranges when new JSON is loaded
        setSelectedTopic(null);
        setTopicRanges([]);
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleTopicClick = (topic: Topic, category: string) => {
    console.log("Topic clicked:", topic, "Category:", category);
    if (selectedTopic && selectedTopic.name === topic.name) {
      console.log("Deselecting topic:", topic.name);
      setSelectedTopic(null);
      setTopicRanges([]);
    } else {
      console.log("Selecting topic:", topic.name);
      setSelectedTopic({ ...topic, category });
      
      // Parse time ranges for the topic
      const ranges: TimeRange[] = [];
      topic.time_ranges.forEach((range: { start: string; end: string }) => {
        const start = parseTimestamp(range.start);
        const end = parseTimestamp(range.end);
        console.log(`Parsed time range for topic ${topic.name}: ${range.start}-${range.end} => ${start}-${end}`);
        ranges.push({ start, end });
      });
      setTopicRanges(ranges);
      console.log("Set topic ranges:", ranges);
      
      // Scroll to the first occurrence
      if (ranges.length > 0 && transcriptRef.current) {
        setTimeout(() => {
          const firstHighlight = transcriptRef.current?.querySelector('.highlight');
          if (firstHighlight) {
            firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  };

  const isSegmentInRange = (segment: TranscriptSegment) => {
    if (!selectedTopic) return false;
    
    const isInRange = topicRanges.some(range => {
      const check = (segment.startTime >= range.start && segment.startTime <= range.end) ||
                    (segment.endTime >= range.start && segment.endTime <= range.end) ||
                    (segment.startTime <= range.start && segment.endTime >= range.end);
      return check;
    });
    
    return isInRange;
  };
  
  const formatTime = (seconds: number): string => {
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

  // Helper function to group consecutive segments from the filtered list
  const groupConsecutiveSegments = (
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

  // Memoize the filtered and grouped segments
  const displayedContent = useMemo(() => {
    const filteredSegments = parsedTranscript.filter(segment => !selectedTopic || isSegmentInRange(segment));
    
    if (selectedTopic) {
      // If a topic is selected, group the filtered segments
      return groupConsecutiveSegments(parsedTranscript, filteredSegments);
    } else {
      // If no topic is selected, return individual segments
      return filteredSegments;
    }
  }, [parsedTranscript, selectedTopic, topicRanges]); // Dependencies for useMemo

  // Generic copy handler with feedback
  const handleCopy = (textToCopy: string, setCopiedState: (copied: boolean) => void) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000); // Reset after 2 seconds
    }, (err) => {
      console.error('Failed to copy: ', err);
      alert('Failed to copy text.');
    });
  };

  // Specific copy handlers
  const handleCopyPrompt = () => {
    handleCopy(promptText, setPromptCopied);
  };

  const handleCopyTopicInfo = () => {
    if (!selectedTopic) return;
    const topicInfoString = `Topic: ${selectedTopic.name}

Information:
${selectedTopic.information}

Key Quotes:
${selectedTopic.key_quotes.map(q => `- ${q}`).join('\n')}

Time Ranges:
${selectedTopic.time_ranges.map(r => `- ${r.start} - ${r.end}`).join('\n')}
`;
    handleCopy(topicInfoString, setTopicInfoCopied);
  };

  const handleCopyTranscriptView = () => {
    let transcriptString = "";
    if (displayedContent.length === 0) return;

    displayedContent.forEach(item => {
      if ('segments' in item) {
        // Grouped segment block
        const group = item as SegmentGroup;
        transcriptString += `${formatTime(group.firstSegment.startTime)}-${formatTime(group.lastSegment.endTime)}\n`;
        transcriptString += group.segments.map(s => s.text).join('\n') + '\n\n';
      } else {
        // Individual segment
        const segment = item as TranscriptSegment;
        transcriptString += `${formatTime(segment.startTime)}-${formatTime(segment.endTime)}\n`;
        transcriptString += segment.text + '\n\n';
      }
    });

    handleCopy(transcriptString.trim(), setTranscriptViewCopied);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Topics */}
      <div className="w-64 bg-white p-4 overflow-y-auto border-r">
        <h2 className="text-xl font-bold mb-4">Topics</h2>
        
        <div className="mb-6">
          <div className="flex flex-col space-y-2 mb-4">
            <label className="font-medium">Upload Files:</label>
            <div className="flex flex-col space-y-2">
              <label className="border rounded p-2 text-center bg-blue-500 text-white cursor-pointer hover:bg-blue-600">
                Upload Transcript
                <input type="file" className="hidden" onChange={handleTranscriptUpload} accept=".txt" />
              </label>
              <label className="border rounded p-2 text-center bg-green-500 text-white cursor-pointer hover:bg-green-600">
                Upload Topics JSON
                <input type="file" className="hidden" onChange={handleJsonUpload} accept=".json" />
              </label>
            </div>
            {/* Add Copy Prompt Button */}     
            <button 
              className={`mt-3 w-full border rounded p-2 text-center text-sm ${promptCopied ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={handleCopyPrompt}
              disabled={promptCopied}
            >
              {promptCopied ? 'Prompt Copied!' : 'Copy Prompt Text'}
            </button>
          </div>
        </div>
        
        {selectedTopic ? (
          <button 
            className="mb-4 px-3 py-1 bg-gray-200 rounded text-sm"
            onClick={() => {
              setSelectedTopic(null);
              setTopicRanges([]);
            }}
          >
            ← Back to all topics
          </button>
        ) : null}
        
        <div>
          <h3 className="font-bold text-blue-600 mb-2">Specific Topics</h3>
          <ul className="mb-4">
            {topics.specific_topics.map((topic, index) => (
              <li 
                key={`specific-${index}`}
                className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-100 ${selectedTopic && selectedTopic.name === topic.name ? 'bg-blue-100' : ''}`}
                onClick={() => handleTopicClick(topic, 'specific')}
              >
                {topic.name}
              </li>
            ))}
          </ul>
          
          <h3 className="font-bold text-green-600 mb-2">General Topics</h3>
          <ul>
            {topics.general_topics.map((topic, index) => (
              <li 
                key={`general-${index}`}
                className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-100 ${selectedTopic && selectedTopic.name === topic.name ? 'bg-green-100' : ''}`}
                onClick={() => handleTopicClick(topic, 'general')}
              >
                {topic.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Right Content - Transcript */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {selectedTopic && (
          <div className="mb-4 bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">{selectedTopic.name}</h2>
              {/* Add Copy Topic Info Button */} 
              <button 
                className={`px-3 py-1 text-xs rounded ${topicInfoCopied ? 'bg-blue-200' : 'bg-blue-100 hover:bg-blue-300'}`}
                onClick={handleCopyTopicInfo}
                disabled={topicInfoCopied}
              >
                {topicInfoCopied ? 'Copied!' : 'Copy Info'}
              </button>
            </div>
            <p className="mb-2">{selectedTopic.information}</p>
            <div className="mt-4">
              <h3 className="font-bold">Key Quotes:</h3>
              <ul className="list-disc pl-5">
                {selectedTopic.key_quotes.map((quote, index) => (
                  <li key={index} className="mb-2 italic">{quote}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Add Copy Transcript View Button */} 
        {parsedTranscript.length > 0 && (
          <div className="mb-2 text-right">
            <button 
              className={`px-3 py-1 text-xs rounded ${transcriptViewCopied ? 'bg-yellow-300' : 'bg-yellow-100 hover:bg-yellow-200'}`}
              onClick={handleCopyTranscriptView}
              disabled={transcriptViewCopied || displayedContent.length === 0}
            >
              {transcriptViewCopied ? 'Copied View!' : 'Copy Current View'}
            </button>
          </div>
        )}
        
        <div className="flex-1 bg-white p-4 rounded shadow overflow-y-auto" ref={transcriptRef}>
          {parsedTranscript.length > 0 ? (
            <div>
              {selectedTopic ? (
                <div className="mb-4">
                  <h3 className="font-bold">Time Ranges for "{selectedTopic.name}":</h3>
                  <ul className="list-disc pl-5">
                    {selectedTopic.time_ranges.map((range, index) => (
                      <li key={index}>{range.start} - {range.end}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              
              {displayedContent.map((item, index) => {
                if ('segments' in item) {
                  // Render a grouped segment block
                  const group = item as SegmentGroup;
                  return (
                    <div 
                      key={`group-${index}`} 
                      className="mb-3 p-2 rounded highlight bg-yellow-100" // Always highlighted when grouped
                    >
                      <div className="font-mono text-xs text-gray-500 mb-1">
                        {formatTime(group.firstSegment.startTime)}-{formatTime(group.lastSegment.endTime)}
                      </div>
                      {/* Join text with newlines */}
                      <div style={{ whiteSpace: 'pre-line' }}> 
                        {group.segments.map(s => s.text).join('\n')}
                      </div>
                    </div>
                  );
                } else {
                  // Render an individual segment (when no topic is selected)
                  const segment = item as TranscriptSegment;
                  return (
                    <div 
                      key={`segment-${index}`} 
                      className="mb-3 p-2 rounded" // No highlight when showing all
                    >
                      <div className="font-mono text-xs text-gray-500 mb-1">
                        {formatTime(segment.startTime)}-{formatTime(segment.endTime)}
                      </div>
                      <div>{segment.text}</div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              {transcript ? 'Processing transcript...' : 'Please upload a transcript file'}
            </div>
          )}
        </div>
        
        {/* Debug Section */}
        <div className="mt-4">
           <button 
             className="text-sm text-blue-600 hover:underline"
             onClick={() => setShowDebugInfo(!showDebugInfo)}
           >
             {showDebugInfo ? 'Hide' : 'Show'} Parsed Segments Debug Info
           </button>
           {showDebugInfo && (
             <div className="mt-2 p-4 bg-gray-50 border rounded max-h-60 overflow-y-auto text-xs">
               <h4 className="font-bold mb-2">Parsed Transcript Segments ({parsedTranscript.length}):</h4>
               {parsedTranscript.map((segment, index) => (
                 <div key={`debug-${index}`} className="mb-1 p-1 border-b">
                   <p><strong>Index:</strong> {index}</p>
                   <p><strong>Time:</strong> {formatTime(segment.startTime)} ({segment.startTime}s) - {formatTime(segment.endTime)} ({segment.endTime}s)</p>
                   <p><strong>Text:</strong> {segment.text}</p>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>
    </div>
  );
};

export default TranscriptAnalyzer;
